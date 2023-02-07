use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{ Exchange, VAULT_AUTHORITY_SEED };

pub fn handler(ctx: Context<Exchange>, exchange_amount: u64) -> Result<()> {
    let (_vault_authority, vault_authority_bump) = Pubkey::find_program_address(
        &[VAULT_AUTHORITY_SEED],
        ctx.program_id
    );
    let authority_seeds = &[&VAULT_AUTHORITY_SEED[..], &[vault_authority_bump]];

    let taker_receive_amount: u64 = (
        ((exchange_amount as f64) / (ctx.accounts.escrow_account.taker_amount as f64)) *
        (ctx.accounts.escrow_account.initializer_amount as f64)
    ).round() as u64;

    token::transfer(ctx.accounts.into_transfer_to_initializer_context(), exchange_amount)?;

    token::transfer(
        ctx.accounts.into_transfer_to_taker_context().with_signer(&[&authority_seeds[..]]),
        taker_receive_amount
    )?;

    ctx.accounts.escrow_account.initializer_amount -= taker_receive_amount;
    ctx.accounts.escrow_account.taker_amount -= exchange_amount;

    Ok(())
}