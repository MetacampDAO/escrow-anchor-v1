use anchor_lang::prelude::*;

pub mod contexts;
pub mod states;
pub mod instructions;
pub mod error;

pub use contexts::*;
declare_id!("Ao8RDJ2x45v1fBm3Y3VLHQyLTmGqNQKp4n9f6bnEFDuB");

const VAULT_AUTHORITY_SEED: &[u8] = b"vault-authority";

#[program]
pub mod escrow_anchor {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        initializer_amount: u64,
        taker_amount: u64
    ) -> Result<()> {
        instructions::initialize::handler(ctx, initializer_amount, taker_amount)
    }

    pub fn exchange(ctx: Context<Exchange>) -> Result<()> {
        instructions::exchange::handler(ctx)
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::handler(ctx)
    }
}