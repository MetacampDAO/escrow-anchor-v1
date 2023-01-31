use anchor_lang::prelude::*;

pub const ESCROW_ACCOUNT_SEED: &[u8] = b"escrow-account";

pub const ESCROW_ACCOUNT_LEN: usize =
    8 + // ANCHOR DISCRIMINATOR
    32 + // INITIALIZER WALLET KEY
    32 + // INITIALIZER RELEASE TOKEN ACCOUNT KEY
    32 + // INITIALIZER RECEIVE TOKEN ACCOUNT KEY
    64 + // INITIALIZER AMOUNT
    64; // TAKER AMOUNT

#[account]
pub struct EscrowAccount {
    pub initializer_key: Pubkey,
    pub initializer_release_token_account: Pubkey,
    pub initializer_receive_token_account: Pubkey,
    pub initializer_amount: u64,
    pub taker_amount: u64,
}