use anchor_lang::prelude::*;
 
#[error_code]
pub enum EscrowError{
 #[msg("Token account does not contain sufficient token amount")]
 InsufficientTokenBalance,
  #[msg("There is a mismatch between given and escrow account's initializer receive token account")]
 InvalidInitializerReceiveTokenAccount,
  #[msg("There is a mismatch between given and escrow account's initializer")]
 InvalidInitializer,
 #[msg("There is a mismatch between given and escrow account's initializer release token account")]
 InvalidInitializerReleaseTokenAccount,
}