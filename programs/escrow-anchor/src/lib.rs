use anchor_lang::prelude::*;

pub mod contexts;
pub mod states;
pub mod instructions;
pub mod error;

pub use contexts::*;
declare_id!("4wHt7GM2iTFL5F9ENN3i1bWfhmh6iqyarrjbbZfvqcb1");

const VAULT_AUTHORITY_SEED: &[u8] = b"vault-authority";

#[program]
pub mod escrow_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn exchange(ctx: Context<Exchange>) -> Result<()> {
        instructions::exchange::handler(ctx)
    }
}
