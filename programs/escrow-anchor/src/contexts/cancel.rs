use anchor_lang::prelude::*;
use anchor_spl::token::{ TokenAccount, Transfer, CloseAccount };

use crate::{ error::EscrowError, states::EscrowAccount };

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,
    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,
    /// CHECK: will fail if vault_authority is not authority of our vault_account
    pub vault_authority: AccountInfo<'info>,
    #[account(mut)]
    pub initializer_release_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = escrow_account.initializer_key == *initializer.key @ EscrowError::InvalidInitializer,
        constraint = escrow_account.initializer_release_token_account == 
            *initializer_release_token_account.to_account_info().key @  EscrowError::InvalidInitializerReleaseTokenAccount,
        close = initializer
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
}

impl<'info> Cancel<'info> {
    pub fn into_transfer_to_initializer_context(
        &self
    ) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.vault_account.to_account_info().clone(),
            to: self.initializer_release_token_account.to_account_info().clone(),
            authority: self.vault_authority.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }

    pub fn into_close_context(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        let cpi_accounts = CloseAccount {
            account: self.vault_account.to_account_info().clone(),
            destination: self.initializer.to_account_info().clone(),
            authority: self.vault_authority.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }
}