use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::contexts::Initialize;

pub fn handler(ctx: Context<Initialize>, amt: u64) -> Result<()> {
    ctx.accounts.escrow_account.initializer_key = *ctx.accounts.initializer.key;
    ctx.accounts.escrow_account.initializer_release_token_account =
        *ctx.accounts.initializer_release_token_account.to_account_info().key;
    ctx.accounts.escrow_account.initializer_receive_token_account =
        *ctx.accounts.initializer_receive_token_account.to_account_info().key;

    token::transfer(ctx.accounts.into_transfer_to_pda_context(), amt)?;

    Ok(())
}