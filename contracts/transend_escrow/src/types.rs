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

/// Persistent, per card. `code_hashes` holds exactly 20 entries; `used` is a
/// bitmask with one bit per line.
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
    // Persistent
    Card(Symbol),
    SenderCards(Address),
}
