use soroban_sdk::{contracttype, Address, BytesN, Symbol, Vec};

/// Hard caps, in USDC base units (7 decimals). Admin can change them.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Limits {
    pub max_balance: i128,
    pub max_daily_load: i128,
    pub max_withdrawal: i128,
    pub max_withdrawals_per_day: u32,
    pub max_cards_per_sender: u32,
    pub max_senders_per_card: u32,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Pending,
    Active,
    Frozen,
    Retired,
}

/// Savings settings set at deploy time. Amounts in USDC base units.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SavingsInit {
    pub apy_bps: u32,
    pub min_stake: i128,
    pub min_liquid: i128,
    pub max_staked_total: i128,
}

/// Savings ("Grow" on screen). The set-aside USDC stays in this contract: the
/// `vault` is the escrow's own address, a mock that a real lending pool can
/// replace later. Yield is paid only from `yield_reserve`, which the admin
/// funds; it is never minted.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SavingsConfig {
    pub vault: Address,
    pub apy_bps: u32,
    pub min_stake: i128,
    pub min_liquid: i128,
    pub max_staked_total: i128,
    pub staked_total: i128,
    pub yield_reserve: i128,
    /// 1 in normal use. Raised only for the demo video so yield shows in seconds.
    pub speedup: u32,
    pub staking_paused: bool,
}

/// Persistent, per card. `code_hashes` holds exactly 20 entries; `used` is a
/// bitmask with one bit per line. `balance` is the total (liquid plus set
/// aside); the liquid part is `balance - staked`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Card {
    pub sender: Address,
    pub funders: Vec<Address>,
    pub status: Status,
    pub balance: i128,
    pub code_hashes: Vec<BytesN<32>>,
    pub used: u32,
    pub renewal_hash: BytesN<32>,
    pub day: u64,
    pub loaded_today: i128,
    pub withdrawals_today: u32,
    pub staked: i128,
    pub yield_credited: i128,
    /// Ledger time of the last yield accrual.
    pub stake_updated: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    // Instance
    Admin,
    Usdc,
    Verifier,
    Paused,
    Limits,
    Savings,
    // Persistent
    Card(Symbol),
    SenderCards(Address),
}
