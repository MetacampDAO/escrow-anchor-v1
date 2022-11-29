use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Mint, Transfer};

use crate::states::{EscrowAccount, ESCROW_ACCOUNT_SEED, ESCROW_ACCOUNT_LEN};


#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        seeds = [b"vault-account".as_ref()],
        bump,
        payer = initializer,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub vault_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"vault-authority".as_ref()],
        bump,
    )]
    /// CHECK: This is not dangerous because we have checked account using seeds
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub initializer_release_token_account: Account<'info, TokenAccount>,
    pub initializer_receive_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        seeds = [ESCROW_ACCOUNT_SEED],
        bump,
        payer = initializer,
        space = ESCROW_ACCOUNT_LEN
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
}


impl <'info> Initialize <'info> {
    pub fn into_transfer_to_pda_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self
                .initializer_release_token_account
                .to_account_info()
                .clone(),
            to: self.vault_account.to_account_info().clone(),
            authority: self.initializer.to_account_info().clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }
}