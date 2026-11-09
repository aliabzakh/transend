#![no_std]
//! Transend escrow: holds every card's USDC and pays a shop only when a valid,
//! unused one-time code arrives with the verification service's signature.
//!
//! Off-chain (not here): PINs, duress PIN, area risk levels, the lower "tense"
//! withdrawal limit. The contract enforces the hard caps only.

mod types;

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, token, xdr::ToXdr, Address, Bytes,
    BytesN, Env, Symbol, Vec,
};
pub use types::{Card, DataKey, Limits, Status};

/// Lines on a card that pay out. The renewal code is a separate 21st secret.
pub const LINES: u32 = 20;
const DAY_SECONDS: u64 = 86_400;
// Ledgers close about every 5 s: bump when under 30 days, extend to 90 days.
const TTL_THRESHOLD: u32 = 518_400;
const TTL_EXTEND_TO: u32 = 1_555_200;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    AlreadyExists = 2,
    NotActive = 3,
    Frozen = 4,
    Paused = 5,
    BadLine = 6,
    CodeUsed = 7,
    BadCode = 8,
    OverWithdrawalLimit = 9,
    TooManyWithdrawals = 10,
    OverDailyLoad = 11,
    OverBalanceLimit = 12,
    InsufficientBalance = 13,
    TooManyCards = 14,
    TooManySenders = 15,
    BadInput = 16,
    /// Caller of `freeze` is neither the verifier nor the card's sender.
    NotAuthorized = 17,
}

// Events. Topics are the event name plus card_id. `Freeze` carries no reason,
// so a duress freeze is indistinguishable from any other freeze on the ledger.
#[contractevent]
pub struct Issue {
    #[topic]
    pub card_id: Symbol,
    pub sender: Address,
}
#[contractevent]
pub struct Activate {
    #[topic]
    pub card_id: Symbol,
}
#[contractevent]
pub struct Deposit {
    #[topic]
    pub card_id: Symbol,
    pub from: Address,
    pub amount: i128,
    pub new_balance: i128,
}
#[contractevent]
pub struct Redeem {
    #[topic]
    pub card_id: Symbol,
    pub line: u32,
    pub amount: i128,
    pub shop: Address,
    pub new_balance: i128,
}
#[contractevent]
pub struct Freeze {
    #[topic]
    pub card_id: Symbol,
}
#[contractevent]
pub struct Unfreeze {
    #[topic]
    pub card_id: Symbol,
}
#[contractevent]
pub struct Renew {
    #[topic]
    pub card_id: Symbol,
    pub new_card_id: Symbol,
    pub balance: i128,
}
#[contractevent]
pub struct Refund {
    #[topic]
    pub card_id: Symbol,
    pub amount: i128,
    pub new_balance: i128,
}
#[contractevent]
pub struct Pause {
    pub paused: bool,
}

#[contract]
pub struct TransendEscrow;

#[contractimpl]
impl TransendEscrow {
    pub fn __constructor(env: Env, admin: Address, usdc: Address, verifier: Address, limits: Limits) {
        let s = env.storage().instance();
        s.set(&DataKey::Admin, &admin);
        s.set(&DataKey::Usdc, &usdc);
        s.set(&DataKey::Verifier, &verifier);
        s.set(&DataKey::Paused, &false);
        s.set(&DataKey::Limits, &limits);
    }

    // ---- admin ----

    pub fn pause(env: Env) {
        Self::admin(&env).require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        Pause { paused: true }.publish(&env);
    }

    pub fn unpause(env: Env) {
        Self::admin(&env).require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        Pause { paused: false }.publish(&env);
    }

    pub fn set_limits(env: Env, limits: Limits) {
        Self::admin(&env).require_auth();
        env.storage().instance().set(&DataKey::Limits, &limits);
    }

    pub fn set_verifier(env: Env, verifier: Address) {
        Self::admin(&env).require_auth();
        env.storage().instance().set(&DataKey::Verifier, &verifier);
    }

    // ---- cards ----

    pub fn issue_card(
        env: Env,
        sender: Address,
        card_id: Symbol,
        code_hashes: Vec<BytesN<32>>,
        renewal_hash: BytesN<32>,
    ) -> Result<(), Error> {
        sender.require_auth();
        if Self::load(&env, &card_id).is_ok() {
            return Err(Error::AlreadyExists);
        }
        if code_hashes.len() != LINES {
            return Err(Error::BadInput);
        }
        let limits = Self::limits(&env);
        let key = DataKey::SenderCards(sender.clone());
        let count: u32 = env.storage().persistent().get(&key).unwrap_or(0);
        if count >= limits.max_cards_per_sender {
            return Err(Error::TooManyCards);
        }
        Self::bump_sender(&env, &key, count + 1);

        let mut funders = Vec::new(&env);
        funders.push_back(sender.clone());
        let card = Card {
            sender: sender.clone(),
            funders,
            status: Status::Pending,
            balance: 0,
            code_hashes,
            used: 0,
            renewal_hash,
            day: Self::today(&env),
            loaded_today: 0,
            withdrawals_today: 0,
        };
        Self::save(&env, &card_id, &card);
        Issue { card_id, sender }.publish(&env);
        Ok(())
    }

    /// The sender's "Yes, that's her".
    pub fn activate(env: Env, card_id: Symbol) -> Result<(), Error> {
        let mut card = Self::load(&env, &card_id)?;
        card.sender.require_auth();
        if card.status != Status::Pending {
            return Err(Error::BadInput);
        }
        card.status = Status::Active;
        Self::save(&env, &card_id, &card);
        Activate { card_id }.publish(&env);
        Ok(())
    }

    pub fn deposit(env: Env, card_id: Symbol, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        Self::not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::BadInput);
        }
        let mut card = Self::load(&env, &card_id)?;
        match card.status {
            Status::Active | Status::Pending => {}
            Status::Frozen => return Err(Error::Frozen),
            Status::Retired => return Err(Error::NotActive),
        }
        let limits = Self::limits(&env);
        if !card.funders.contains(&from) {
            if card.funders.len() >= limits.max_senders_per_card {
                return Err(Error::TooManySenders);
            }
            card.funders.push_back(from.clone());
        }
        Self::roll_day(&env, &mut card);
        if card.loaded_today + amount > limits.max_daily_load {
            return Err(Error::OverDailyLoad);
        }
        if card.balance + amount > limits.max_balance {
            return Err(Error::OverBalanceLimit);
        }

        token::Client::new(&env, &Self::usdc(&env)).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
        card.balance += amount;
        card.loaded_today += amount;
        Self::save(&env, &card_id, &card);
        Deposit { card_id, from, amount, new_balance: card.balance }.publish(&env);
        Ok(())
    }

    /// Pays `amount` to `shop` against one unused line. Only the verification
    /// service can call this, after it has checked the PIN and the area risk level.
    pub fn redeem(
        env: Env,
        card_id: Symbol,
        line: u32,
        code: Bytes,
        amount: i128,
        shop: Address,
    ) -> Result<(), Error> {
        Self::verifier(&env).require_auth();
        Self::not_paused(&env)?;
        let mut card = Self::load(&env, &card_id)?;
        Self::require_active(&card)?;
        if line >= LINES {
            return Err(Error::BadLine);
        }
        if card.used & (1 << line) != 0 {
            return Err(Error::CodeUsed);
        }
        if Self::code_hash(&env, &card_id, line, &code) != card.code_hashes.get(line).unwrap() {
            return Err(Error::BadCode);
        }
        if amount <= 0 {
            return Err(Error::BadInput);
        }
        let limits = Self::limits(&env);
        if amount > limits.max_withdrawal {
            return Err(Error::OverWithdrawalLimit);
        }
        if amount > card.balance {
            return Err(Error::InsufficientBalance);
        }
        Self::roll_day(&env, &mut card);
        if card.withdrawals_today >= limits.max_withdrawals_per_day {
            return Err(Error::TooManyWithdrawals);
        }

        // State first, transfer last: the line is spent before any money moves.
        card.used |= 1 << line;
        card.balance -= amount;
        card.withdrawals_today += 1;
        Self::save(&env, &card_id, &card);
        token::Client::new(&env, &Self::usdc(&env)).transfer(
            &env.current_contract_address(),
            &shop,
            &amount,
        );
        Redeem { card_id, line, amount, shop, new_balance: card.balance }.publish(&env);
        Ok(())
    }

    /// `caller` must be the verifier (duress PIN, five wrong PINs) or the
    /// card's sender (lost card), and must sign.
    pub fn freeze(env: Env, card_id: Symbol, caller: Address) -> Result<(), Error> {
        let mut card = Self::load(&env, &card_id)?;
        if caller != card.sender && caller != Self::verifier(&env) {
            return Err(Error::NotAuthorized);
        }
        caller.require_auth();
        Self::require_active(&card)?;
        card.status = Status::Frozen;
        Self::save(&env, &card_id, &card);
        Freeze { card_id }.publish(&env);
        Ok(())
    }

    pub fn unfreeze(env: Env, card_id: Symbol) -> Result<(), Error> {
        let mut card = Self::load(&env, &card_id)?;
        card.sender.require_auth();
        if card.status != Status::Frozen {
            return Err(Error::BadInput);
        }
        card.status = Status::Active;
        Self::save(&env, &card_id, &card);
        Unfreeze { card_id }.publish(&env);
        Ok(())
    }

    pub fn balance(env: Env, card_id: Symbol) -> Result<i128, Error> {
        Ok(Self::load(&env, &card_id)?.balance)
    }

    pub fn card(env: Env, card_id: Symbol) -> Result<Card, Error> {
        Self::load(&env, &card_id)
    }

    // ---- nice to have: renewal and refund ----

    /// Moves the balance onto a fresh card. The renewal code is the card's 21st
    /// secret: its hash is sha256(card_id || 20 as u32 BE || renewal_code).
    pub fn renew(
        env: Env,
        card_id: Symbol,
        renewal_code: Bytes,
        new_card_id: Symbol,
        new_hashes: Vec<BytesN<32>>,
        new_renewal_hash: BytesN<32>,
    ) -> Result<(), Error> {
        Self::verifier(&env).require_auth();
        Self::not_paused(&env)?;
        let mut old = Self::load(&env, &card_id)?;
        Self::require_active(&old)?;
        if Self::code_hash(&env, &card_id, LINES, &renewal_code) != old.renewal_hash {
            return Err(Error::BadCode);
        }
        if Self::load(&env, &new_card_id).is_ok() {
            return Err(Error::AlreadyExists);
        }
        if new_hashes.len() != LINES {
            return Err(Error::BadInput);
        }
        let balance = old.balance;
        let new = Card {
            sender: old.sender.clone(),
            funders: old.funders.clone(),
            status: Status::Active,
            balance,
            code_hashes: new_hashes,
            used: 0,
            renewal_hash: new_renewal_hash,
            day: old.day,
            loaded_today: old.loaded_today,
            withdrawals_today: old.withdrawals_today,
        };
        old.status = Status::Retired;
        old.balance = 0;
        // The sender's card count is unchanged: the old card retires, the new one replaces it.
        Self::save(&env, &card_id, &old);
        Self::save(&env, &new_card_id, &new);
        Renew { card_id, new_card_id, balance }.publish(&env);
        Ok(())
    }

    /// Returns part or all of a lost card's balance to its sender.
    pub fn refund(env: Env, card_id: Symbol, amount: i128) -> Result<(), Error> {
        Self::not_paused(&env)?;
        let mut card = Self::load(&env, &card_id)?;
        card.sender.require_auth();
        if card.status == Status::Retired {
            return Err(Error::NotActive);
        }
        if amount <= 0 {
            return Err(Error::BadInput);
        }
        if amount > card.balance {
            return Err(Error::InsufficientBalance);
        }
        card.balance -= amount;
        Self::save(&env, &card_id, &card);
        token::Client::new(&env, &Self::usdc(&env)).transfer(
            &env.current_contract_address(),
            &card.sender,
            &amount,
        );
        Refund { card_id, amount, new_balance: card.balance }.publish(&env);
        Ok(())
    }
}

// ---- helpers ----
impl TransendEscrow {
    fn admin(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
    fn usdc(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Usdc).unwrap()
    }
    fn verifier(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Verifier).unwrap()
    }
    fn limits(env: &Env) -> Limits {
        env.storage().instance().get(&DataKey::Limits).unwrap()
    }
    fn not_paused(env: &Env) -> Result<(), Error> {
        if env.storage().instance().get(&DataKey::Paused).unwrap_or(false) {
            return Err(Error::Paused);
        }
        Ok(())
    }
    fn require_active(card: &Card) -> Result<(), Error> {
        match card.status {
            Status::Active => Ok(()),
            Status::Frozen => Err(Error::Frozen),
            Status::Pending | Status::Retired => Err(Error::NotActive),
        }
    }
    fn today(env: &Env) -> u64 {
        env.ledger().timestamp() / DAY_SECONDS
    }
    /// Daily counters reset on the first touch of a new ledger day.
    fn roll_day(env: &Env, card: &mut Card) {
        let today = Self::today(env);
        if card.day != today {
            card.day = today;
            card.loaded_today = 0;
            card.withdrawals_today = 0;
        }
    }
    fn load(env: &Env, card_id: &Symbol) -> Result<Card, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Card(card_id.clone()))
            .ok_or(Error::NotFound)
    }
    fn save(env: &Env, card_id: &Symbol, card: &Card) {
        let key = DataKey::Card(card_id.clone());
        env.storage().persistent().set(&key, card);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }
    fn bump_sender(env: &Env, key: &DataKey, count: u32) {
        env.storage().persistent().set(key, &count);
        env.storage().persistent().extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }
    /// sha256(card_id ascii || line as u32 big-endian || code ascii).
    fn code_hash(env: &Env, card_id: &Symbol, line: u32, code: &Bytes) -> BytesN<32> {
        // A Symbol's XDR is 4 bytes of type, 4 bytes of length, then the padded text.
        let xdr = card_id.clone().to_xdr(env);
        let mut len_bytes = [0u8; 4];
        xdr.slice(4..8).copy_into_slice(&mut len_bytes);
        let len = u32::from_be_bytes(len_bytes);

        let mut preimage = xdr.slice(8..8 + len);
        preimage.extend_from_array(&line.to_be_bytes());
        preimage.append(code);
        env.crypto().sha256(&preimage).to_bytes()
    }
}

mod test;
