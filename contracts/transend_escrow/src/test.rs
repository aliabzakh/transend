#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events as _, Ledger as _},
    token::{StellarAssetClient, TokenClient},
    Address, Bytes, BytesN, Env, Symbol, Vec,
};

const USD: i128 = 10_000_000; // 7 decimals
const CARD: Symbol = symbol_short!("TS4F2K9Q");
const CARD2: Symbol = symbol_short!("TS7M3P8R");

struct T<'a> {
    env: Env,
    c: TransendEscrowClient<'a>,
    usdc: TokenClient<'a>,
    admin: Address,
    verifier: Address,
    sender: Address,
    shop: Address,
}

fn savings_init() -> SavingsInit {
    SavingsInit {
        apy_bps: 400,
        min_stake: 10 * USD,
        min_liquid: 100 * USD,
        max_staked_total: 5_000 * USD,
    }
}

fn limits() -> Limits {
    Limits {
        max_balance: 635 * USD,
        max_daily_load: 635 * USD,
        max_withdrawal: 100 * USD,
        max_withdrawals_per_day: 2,
        max_cards_per_sender: 3,
        max_senders_per_card: 2,
    }
}

/// The code printed on line `i` of a card: 12 Crockford base32 characters.
fn code(env: &Env, card: &str, i: u32) -> Bytes {
    Bytes::from_slice(env, &std::format!("{}X{:03}ZZZZZZ", &card[2..4], i).as_bytes()[..12])
}

/// Independent re-implementation of the hash with plain byte arrays,
/// so the test proves the on-chain preimage layout is exactly as documented.
fn hash(env: &Env, card: &str, line: u32, code: &Bytes) -> BytesN<32> {
    let mut v = std::vec::Vec::new();
    v.extend_from_slice(card.as_bytes());
    v.extend_from_slice(&line.to_be_bytes());
    let mut buf = std::vec![0u8; code.len() as usize];
    code.copy_into_slice(&mut buf);
    v.extend_from_slice(&buf);
    env.crypto().sha256(&Bytes::from_slice(env, &v)).to_bytes()
}

fn hashes(env: &Env, card: &str) -> Vec<BytesN<32>> {
    let mut out = Vec::new(env);
    for i in 0..20 {
        out.push_back(hash(env, card, i, &code(env, card, i)));
    }
    out
}

fn renewal_code(env: &Env) -> Bytes {
    Bytes::from_slice(env, b"RENEWCODE123")
}

fn setup<'a>() -> T<'a> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_800_000_000);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let sender = Address::generate(&env);
    let shop = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let usdc = TokenClient::new(&env, &sac.address());
    StellarAssetClient::new(&env, &sac.address()).mint(&sender, &(5_000 * USD));
    let id = env.register(
        TransendEscrow,
        (admin.clone(), sac.address(), verifier.clone(), limits(), savings_init()),
    );
    let c = TransendEscrowClient::new(&env, &id);
    T { env, c, usdc, admin, verifier, sender, shop }
}

/// Issues CARD, activates it and loads US$300.
fn funded<'a>() -> T<'a> {
    let t = setup();
    t.c.issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &hash(&t.env, "TS4F2K9Q", 20, &renewal_code(&t.env)));
    t.c.activate(&CARD);
    t.c.deposit(&CARD, &t.sender, &(300 * USD));
    t
}

fn redeem(t: &T, line: u32, amount: i128) -> Result<(), Error> {
    match t.c.try_redeem(&CARD, &line, &code(&t.env, "TS4F2K9Q", line), &amount, &t.shop) {
        Ok(Ok(())) => Ok(()),
        Err(Ok(e)) => Err(e),
        other => panic!("unexpected: {:?}", other),
    }
}

// ---- happy path and single use ----

#[test]
fn valid_code_redeems_once_then_is_rejected_with_code_used() {
    let t = funded();
    assert_eq!(t.c.balance(&CARD), 300 * USD);
    assert_eq!(t.usdc.balance(&t.c.address), 300 * USD);

    redeem(&t, 0, 40 * USD).unwrap();
    assert_eq!(t.usdc.balance(&t.shop), 40 * USD);
    assert_eq!(t.c.balance(&CARD), 260 * USD);

    assert_eq!(redeem(&t, 0, 40 * USD), Err(Error::CodeUsed));
    assert_eq!(t.usdc.balance(&t.shop), 40 * USD, "nothing moved on replay");
    // A different line still works.
    redeem(&t, 1, 40 * USD).unwrap();
}

#[test]
fn wrong_code_is_rejected_with_bad_code_and_nothing_moves() {
    let t = funded();
    let r = t.c.try_redeem(&CARD, &0, &code(&t.env, "TS4F2K9Q", 1), &(10 * USD), &t.shop);
    assert_eq!(r, Err(Ok(Error::BadCode)));
    assert_eq!(t.usdc.balance(&t.shop), 0);
    assert_eq!(t.c.balance(&CARD), 300 * USD);
    // The line was not burned by the failed attempt.
    redeem(&t, 0, 10 * USD).unwrap();
}

#[test]
fn out_of_range_line_is_bad_line() {
    let t = funded();
    let r = t.c.try_redeem(&CARD, &20, &code(&t.env, "TS4F2K9Q", 0), &(10 * USD), &t.shop);
    assert_eq!(r, Err(Ok(Error::BadLine)));
}

// ---- limits ----

#[test]
fn over_withdrawal_limit_is_rejected() {
    let t = funded();
    assert_eq!(redeem(&t, 0, 100 * USD + 1), Err(Error::OverWithdrawalLimit));
    redeem(&t, 0, 100 * USD).unwrap();
}

#[test]
fn amount_above_balance_is_rejected() {
    let t = setup();
    t.c.issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &hash(&t.env, "TS4F2K9Q", 20, &renewal_code(&t.env)));
    t.c.activate(&CARD);
    t.c.deposit(&CARD, &t.sender, &(30 * USD));
    assert_eq!(redeem(&t, 0, 31 * USD), Err(Error::InsufficientBalance));
}

#[test]
fn third_withdrawal_in_one_day_is_rejected() {
    let t = funded();
    redeem(&t, 0, 10 * USD).unwrap();
    redeem(&t, 1, 10 * USD).unwrap();
    assert_eq!(redeem(&t, 2, 10 * USD), Err(Error::TooManyWithdrawals));
}

#[test]
fn over_daily_load_is_rejected() {
    let t = setup();
    t.c.issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &hash(&t.env, "TS4F2K9Q", 20, &renewal_code(&t.env)));
    t.c.activate(&CARD);
    t.c.deposit(&CARD, &t.sender, &(600 * USD));
    // Balance room is 35, so shrink it: withdraw some, then load again the same day.
    redeem(&t, 0, 100 * USD).unwrap();
    // Balance 500, loaded today 600: only 35 more is allowed today.
    assert_eq!(
        t.c.try_deposit(&CARD, &t.sender, &(36 * USD)),
        Err(Ok(Error::OverDailyLoad))
    );
    t.c.deposit(&CARD, &t.sender, &(35 * USD));
}

#[test]
fn over_balance_limit_is_rejected() {
    let t = setup();
    t.c.issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &hash(&t.env, "TS4F2K9Q", 20, &renewal_code(&t.env)));
    // Loosen the daily cap so that only the balance cap can trip.
    let mut l = limits();
    l.max_daily_load = 10_000 * USD;
    t.c.set_limits(&l);
    t.c.deposit(&CARD, &t.sender, &(600 * USD));
    assert_eq!(
        t.c.try_deposit(&CARD, &t.sender, &(36 * USD)),
        Err(Ok(Error::OverBalanceLimit))
    );
}

#[test]
fn zero_or_negative_amounts_are_bad_input() {
    let t = funded();
    assert_eq!(t.c.try_deposit(&CARD, &t.sender, &0), Err(Ok(Error::BadInput)));
    assert_eq!(redeem(&t, 0, 0), Err(Error::BadInput));
    assert_eq!(redeem(&t, 0, -5), Err(Error::BadInput));
}

#[test]
fn daily_counters_reset_on_the_next_ledger_day() {
    let t = funded();
    redeem(&t, 0, 10 * USD).unwrap();
    redeem(&t, 1, 10 * USD).unwrap();
    assert_eq!(redeem(&t, 2, 10 * USD), Err(Error::TooManyWithdrawals));
    assert_eq!(
        t.c.try_deposit(&CARD, &t.sender, &(400 * USD)),
        Err(Ok(Error::OverDailyLoad))
    );

    t.env.ledger().set_timestamp(1_800_000_000 + 86_400);
    redeem(&t, 2, 10 * USD).unwrap();
    t.c.deposit(&CARD, &t.sender, &(300 * USD));
    assert_eq!(t.c.card(&CARD).loaded_today, 300 * USD);
}

#[test]
fn a_sender_cannot_have_more_than_three_cards() {
    let t = setup();
    for id in ["TS000001", "TS000002", "TS000003"] {
        t.c.issue_card(&t.sender, &Symbol::new(&t.env, id), &hashes(&t.env, id), &hash(&t.env, id, 20, &renewal_code(&t.env)));
    }
    let r = t.c.try_issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &hash(&t.env, "TS4F2K9Q", 20, &renewal_code(&t.env)));
    assert_eq!(r, Err(Ok(Error::TooManyCards)));
}

#[test]
fn card_needs_exactly_twenty_hashes_and_a_fresh_id() {
    let t = setup();
    let mut short = hashes(&t.env, "TS4F2K9Q");
    short.pop_back();
    let rh = hash(&t.env, "TS4F2K9Q", 20, &renewal_code(&t.env));
    assert_eq!(t.c.try_issue_card(&t.sender, &CARD, &short, &rh), Err(Ok(Error::BadInput)));
    t.c.issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &rh);
    assert_eq!(
        t.c.try_issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &rh),
        Err(Ok(Error::AlreadyExists))
    );
}

#[test]
fn a_third_funding_address_is_rejected_with_too_many_senders() {
    let t = funded();
    let second = Address::generate(&t.env);
    let third = Address::generate(&t.env);
    for a in [&second, &third] {
        StellarAssetClient::new(&t.env, &t.usdc.address).mint(a, &(100 * USD));
    }
    t.c.deposit(&CARD, &second, &(10 * USD));
    assert_eq!(
        t.c.try_deposit(&CARD, &third, &(10 * USD)),
        Err(Ok(Error::TooManySenders))
    );
    // An existing funder can still top up.
    t.c.deposit(&CARD, &second, &(10 * USD));
    assert_eq!(t.c.card(&CARD).funders.len(), 2);
}

// ---- signatures ----

#[test]
fn redeem_without_the_verifiers_signature_fails() {
    let t = funded();
    t.env.set_auths(&[]);
    let r = t.c.try_redeem(&CARD, &0, &code(&t.env, "TS4F2K9Q", 0), &(10 * USD), &t.shop);
    assert!(r.is_err());
    assert_eq!(t.usdc.balance(&t.shop), 0);
}

#[test]
fn deposit_without_froms_signature_fails() {
    let t = funded();
    t.env.set_auths(&[]);
    let r = t.c.try_deposit(&CARD, &t.sender, &(10 * USD));
    assert!(r.is_err());
    assert_eq!(t.c.balance(&CARD), 300 * USD);
}

#[test]
fn redeem_requires_auth_from_the_stored_verifier() {
    let t = funded();
    redeem(&t, 0, 10 * USD).unwrap();
    let auths = t.env.auths();
    assert!(auths.iter().any(|(a, _)| *a == t.verifier));
}

// ---- status rules ----

#[test]
fn pending_card_cannot_be_redeemed() {
    let t = setup();
    t.c.issue_card(&t.sender, &CARD, &hashes(&t.env, "TS4F2K9Q"), &hash(&t.env, "TS4F2K9Q", 20, &renewal_code(&t.env)));
    t.c.deposit(&CARD, &t.sender, &(50 * USD)); // loading a Pending card is allowed
    assert_eq!(redeem(&t, 0, 10 * USD), Err(Error::NotActive));
}

#[test]
fn frozen_card_cannot_be_redeemed_or_loaded_and_only_the_sender_unfreezes() {
    let t = funded();
    t.c.freeze(&CARD, &t.verifier);
    assert_eq!(t.c.card(&CARD).status, Status::Frozen);
    assert_eq!(redeem(&t, 0, 10 * USD), Err(Error::Frozen));
    assert_eq!(t.c.try_deposit(&CARD, &t.sender, &USD), Err(Ok(Error::Frozen)));

    // Unfreeze demands the card's sender, not the verifier or anyone else.
    t.c.unfreeze(&CARD);
    let auths = t.env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, t.sender);
    assert_eq!(t.c.card(&CARD).status, Status::Active);
    redeem(&t, 0, 10 * USD).unwrap();
}

#[test]
fn only_the_verifier_or_the_sender_can_freeze() {
    let t = funded();
    let stranger = Address::generate(&t.env);
    assert_eq!(t.c.try_freeze(&CARD, &stranger), Err(Ok(Error::NotAuthorized)));
    t.c.freeze(&CARD, &t.sender);
    assert_eq!(t.c.card(&CARD).status, Status::Frozen);
}

#[test]
fn freeze_without_the_callers_signature_fails() {
    let t = funded();
    t.env.set_auths(&[]);
    assert!(t.c.try_freeze(&CARD, &t.verifier).is_err());
}

#[test]
fn paused_contract_rejects_deposit_and_redeem() {
    let t = funded();
    t.c.pause();
    assert_eq!(t.c.try_deposit(&CARD, &t.sender, &USD), Err(Ok(Error::Paused)));
    assert_eq!(redeem(&t, 0, 10 * USD), Err(Error::Paused));
    t.c.unpause();
    redeem(&t, 0, 10 * USD).unwrap();
}

#[test]
fn admin_functions_need_the_admin_and_can_rotate_the_verifier() {
    let t = funded();
    let new_verifier = Address::generate(&t.env);
    t.c.set_verifier(&new_verifier);
    let auths = t.env.auths();
    assert_eq!(auths[0].0, t.admin);
    redeem(&t, 0, 10 * USD).unwrap();
    assert!(t.env.auths().iter().any(|(a, _)| *a == new_verifier));
}

#[test]
fn unknown_card_is_not_found() {
    let t = setup();
    assert_eq!(t.c.try_balance(&CARD), Err(Ok(Error::NotFound)));
}

// ---- renewal and refund ----

#[test]
fn after_renewal_the_old_card_rejects_everything_but_balance_and_the_new_card_carries_the_balance() {
    let t = funded();
    redeem(&t, 0, 50 * USD).unwrap();
    let new_hashes = hashes(&t.env, "TS7M3P8R");
    let new_rh = hash(&t.env, "TS7M3P8R", 20, &Bytes::from_slice(&t.env, b"NEWRENEW1234"));

    // Wrong renewal code is refused.
    let bad = t.c.try_renew(&CARD, &Bytes::from_slice(&t.env, b"WRONGWRONG12"), &CARD2, &new_hashes, &new_rh);
    assert_eq!(bad, Err(Ok(Error::BadCode)));

    t.c.renew(&CARD, &renewal_code(&t.env), &CARD2, &new_hashes, &new_rh);
    assert_eq!(t.c.balance(&CARD), 0);
    assert_eq!(t.c.card(&CARD).status, Status::Retired);
    assert_eq!(t.c.balance(&CARD2), 250 * USD);
    assert_eq!(t.c.card(&CARD2).status, Status::Active);

    // Old card: redeem, deposit, freeze, unfreeze, activate, refund, renew all fail.
    assert_eq!(redeem(&t, 1, 10 * USD), Err(Error::NotActive));
    assert_eq!(t.c.try_deposit(&CARD, &t.sender, &USD), Err(Ok(Error::NotActive)));
    assert_eq!(t.c.try_freeze(&CARD, &t.sender), Err(Ok(Error::NotActive)));
    assert!(t.c.try_unfreeze(&CARD).is_err());
    assert!(t.c.try_activate(&CARD).is_err());
    assert_eq!(t.c.try_refund(&CARD, &USD), Err(Ok(Error::NotActive)));
    assert!(t.c.try_renew(&CARD, &renewal_code(&t.env), &Symbol::new(&t.env, "TS000009"), &new_hashes, &new_rh).is_err());

    // New card pays out with its own codes, and its own renewal code works only on it.
    let r = t.c.try_redeem(&CARD2, &0, &code(&t.env, "TS7M3P8R", 0), &(20 * USD), &t.shop);
    assert_eq!(r, Ok(Ok(())));
    assert_eq!(t.c.balance(&CARD2), 230 * USD);
}

#[test]
fn renewal_does_not_use_up_a_card_slot() {
    let t = funded();
    for id in ["TS000001", "TS000002"] {
        t.c.issue_card(&t.sender, &Symbol::new(&t.env, id), &hashes(&t.env, id), &hash(&t.env, id, 20, &renewal_code(&t.env)));
    }
    let new_rh = hash(&t.env, "TS7M3P8R", 20, &renewal_code(&t.env));
    t.c.renew(&CARD, &renewal_code(&t.env), &CARD2, &hashes(&t.env, "TS7M3P8R"), &new_rh);
    // Still three active/retired slots used by this sender: a fourth is refused.
    let r = t.c.try_issue_card(&t.sender, &Symbol::new(&t.env, "TS000003"), &hashes(&t.env, "TS000003"), &new_rh);
    assert_eq!(r, Err(Ok(Error::TooManyCards)));
}

#[test]
fn refund_returns_usdc_to_the_sender_even_when_frozen() {
    let t = funded();
    t.c.freeze(&CARD, &t.sender);
    let before = t.usdc.balance(&t.sender);
    t.c.refund(&CARD, &(100 * USD));
    assert_eq!(t.usdc.balance(&t.sender), before + 100 * USD);
    assert_eq!(t.c.balance(&CARD), 200 * USD);
    assert_eq!(t.c.try_refund(&CARD, &(201 * USD)), Err(Ok(Error::InsufficientBalance)));
}

// ---- events ----

#[test]
fn freeze_event_carries_no_reason_and_redeem_event_is_emitted() {
    use soroban_sdk::xdr::{ContractEventBody, ScVal};
    let t = funded();

    redeem(&t, 0, 10 * USD).unwrap();
    let events = t.env.events().all();
    let ContractEventBody::V0(b) = &events.events().last().unwrap().body;
    assert!(matches!(&b.topics[0], ScVal::Symbol(s) if s.to_utf8_string_lossy() == "redeem"));
    assert!(matches!(&b.topics[1], ScVal::Symbol(s) if s.to_utf8_string_lossy() == "TS4F2K9Q"));

    t.c.freeze(&CARD, &t.verifier);
    let events = t.env.events().all();
    let ContractEventBody::V0(b) = &events.events().last().unwrap().body;
    assert!(matches!(&b.topics[0], ScVal::Symbol(s) if s.to_utf8_string_lossy() == "freeze"));
    // Topics are the name and the card ID; the data is empty, so no reason is recorded.
    assert_eq!(b.topics.len(), 2);
    assert!(matches!(&b.data, ScVal::Map(Some(m)) if m.0.is_empty()));
}
