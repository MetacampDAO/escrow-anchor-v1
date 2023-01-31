use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{ Cancel, VAULT_AUTHORITY_SEED };

pub fn handler(ctx: Context<Cancel>) -> Result<()> {
    let (_vault_authority, vault_authority_bump) = Pubkey::find_program_address(
        &[VAULT_AUTHORITY_SEED],
        ctx.program_id
    );
    let authority_seeds = &[&VAULT_AUTHORITY_SEED[..], &[vault_authority_bump]];

    token::transfer(
        ctx.accounts.into_transfer_to_initializer_context().with_signer(&[&authority_seeds[..]]),
        1
    )?;

    token::close_account(ctx.accounts.into_close_context().with_signer(&[&authority_seeds[..]]))?;

    Ok(())
}