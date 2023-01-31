import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { EscrowAnchor } from "../target/types/escrow_anchor";
import { PublicKey } from "@solana/web3.js";
import {
  createAccount,
  createMint,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow-anchor", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.EscrowAnchor as Program<EscrowAnchor>;
  let mintA: PublicKey;
  let mintB: PublicKey;
  let initializerTokenAccountA: PublicKey;
  let initializerTokenAccountB: PublicKey;
  let takerTokenAccountA: PublicKey;
  let takerTokenAccountB: PublicKey;
  let vault_account_pda: PublicKey;
  let vault_authority_pda: PublicKey;
  let escrow_account_pda: PublicKey;

  const takerAmount = 1000;
  const initializerAmount = 500;

  const mintAuthority = anchor.web3.Keypair.generate();
  const initializerWallet = anchor.web3.Keypair.generate();
  const takerWallet = anchor.web3.Keypair.generate();

  it("Initialize program state", async () => {
    const airdropInitializerSig = await provider.connection.requestAirdrop(
      initializerWallet.publicKey,
      2e9
    );

    const latestInitializerBlockhash =
      await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestInitializerBlockhash.blockhash,
      lastValidBlockHeight: latestInitializerBlockhash.lastValidBlockHeight,
      signature: airdropInitializerSig,
    });

    const airdropTakerSig = await provider.connection.requestAirdrop(
      takerWallet.publicKey,
      2e9
    );
    const latestTakerBlockhash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestTakerBlockhash.blockhash,
      lastValidBlockHeight: latestTakerBlockhash.lastValidBlockHeight,
      signature: airdropTakerSig,
    });

    const airdropAuthoritySig = await provider.connection.requestAirdrop(
      mintAuthority.publicKey,
      2e9
    );
    const latestAuthorityBlockhash =
      await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestAuthorityBlockhash.blockhash,
      lastValidBlockHeight: latestAuthorityBlockhash.lastValidBlockHeight,
      signature: airdropAuthoritySig,
    });

    mintA = await createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0
    );

    initializerTokenAccountA = await createAccount(
      provider.connection,
      initializerWallet,
      mintA,
      initializerWallet.publicKey
    );

    takerTokenAccountA = await createAccount(
      provider.connection,
      takerWallet,
      mintA,
      takerWallet.publicKey
    );

    await mintTo(
      provider.connection,
      mintAuthority,
      mintA,
      initializerTokenAccountA,
      mintAuthority,
      initializerAmount
    );

    mintB = await createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0
    );

    initializerTokenAccountB = await createAccount(
      provider.connection,
      initializerWallet,
      mintB,
      initializerWallet.publicKey
    );

    takerTokenAccountB = await createAccount(
      provider.connection,
      takerWallet,
      mintB,
      takerWallet.publicKey
    );

    await mintTo(
      provider.connection,
      mintAuthority,
      mintB,
      takerTokenAccountB,
      mintAuthority,
      takerAmount
    );

    const _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );

    const _initializerTokenAccountB = await getAccount(
      provider.connection,
      initializerTokenAccountB
    );

    const _takerTokenAccountA = await getAccount(
      provider.connection,
      takerTokenAccountA
    );

    const _takerTokenAccountB = await getAccount(
      provider.connection,
      takerTokenAccountB
    );

    assert.ok(Number(_initializerTokenAccountA.amount) == initializerAmount);
    assert.ok(
      _initializerTokenAccountA.owner.equals(initializerWallet.publicKey)
    );
    assert.ok(_initializerTokenAccountA.mint.equals(mintA));

    assert.ok(Number(_initializerTokenAccountB.amount) == 0);
    assert.ok(
      _initializerTokenAccountB.owner.equals(initializerWallet.publicKey)
    );
    assert.ok(_initializerTokenAccountB.mint.equals(mintB));

    assert.ok(Number(_takerTokenAccountA.amount) == 0);
    assert.ok(_takerTokenAccountA.owner.equals(takerWallet.publicKey));
    assert.ok(_takerTokenAccountA.mint.equals(mintA));

    assert.ok(Number(_takerTokenAccountB.amount) == takerAmount);
    assert.ok(_takerTokenAccountB.owner.equals(takerWallet.publicKey));
    assert.ok(_takerTokenAccountB.mint.equals(mintB));
  });

  it("Initialize escrow", async () => {
    const [_vault_account_pda] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("vault-account"))],
      program.programId
    );
    vault_account_pda = _vault_account_pda;

    const [_vault_authority_pda] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("vault-authority"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    const [_escrow_account_pda] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow-account"))],
      program.programId
    );
    escrow_account_pda = _escrow_account_pda;

    await program.methods
      .initialize(new anchor.BN(initializerAmount), new anchor.BN(takerAmount))
      .accounts({
        initializer: initializerWallet.publicKey,
        mint: mintA,
        vaultAccount: vault_account_pda,
        vaultAuthority: vault_authority_pda,
        initializerReleaseTokenAccount: initializerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        escrowAccount: escrow_account_pda,
      })
      .signers([initializerWallet])
      .rpc();

    let _vault = await getAccount(provider.connection, vault_account_pda);
    let _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );

    let _escrow_account_pda_serialized =
      await program.account.escrowAccount.fetch(escrow_account_pda);

    assert.ok(_vault.owner.equals(vault_authority_pda));
    assert.ok(
      _escrow_account_pda_serialized.initializerKey.equals(
        initializerWallet.publicKey
      )
    );
    assert.ok(
      _escrow_account_pda_serialized.initializerReleaseTokenAccount.equals(
        initializerTokenAccountA
      )
    );
    assert.ok(
      _escrow_account_pda_serialized.initializerReceiveTokenAccount.equals(
        initializerTokenAccountB
      )
    );
    assert.ok(
      _escrow_account_pda_serialized.initializerAmount.toNumber() ==
        initializerAmount
    );
    assert.ok(
      _escrow_account_pda_serialized.takerAmount.toNumber() == takerAmount
    );
    assert.ok(Number(_vault.amount) == initializerAmount);
    assert.ok(Number(_initializerTokenAccountA.amount) == 0);
  });

  it("Exchange escrow", async () => {
    await program.methods
      .exchange()
      .accounts({
        taker: takerWallet.publicKey,
        takerReleaseTokenAccount: takerTokenAccountB,
        takerReceiveTokenAccount: takerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        initializer: initializerWallet.publicKey,
        escrowAccount: escrow_account_pda,
        vaultAccount: vault_account_pda,
        vaultAuthority: vault_authority_pda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([takerWallet])
      .rpc();

    let _takerTokenAccountA = await getAccount(
      provider.connection,
      takerTokenAccountA
    );
    let _takerTokenAccountB = await getAccount(
      provider.connection,
      takerTokenAccountB
    );
    let _initializerTokenAccountB = await getAccount(
      provider.connection,
      initializerTokenAccountB
    );

    assert.ok(Number(_takerTokenAccountA.amount) == initializerAmount);
    assert.ok(Number(_takerTokenAccountB.amount) == 0);
    assert.ok(Number(_initializerTokenAccountB.amount) == takerAmount);
  });

  it("Cancel escrow", async () => {
    await program.methods
      .initialize(new anchor.BN(initializerAmount), new anchor.BN(takerAmount))
      .accounts({
        initializer: takerWallet.publicKey,
        mint: mintA,
        vaultAccount: vault_account_pda,
        vaultAuthority: vault_authority_pda,
        initializerReleaseTokenAccount: takerTokenAccountA,
        initializerReceiveTokenAccount: takerTokenAccountB,
        escrowAccount: escrow_account_pda,
      })
      .signers([takerWallet])
      .rpc();
    let _afterInitialize_vault = await getAccount(
      provider.connection,
      vault_account_pda
    );
    let _afterInitialize_takerTokenAccountA = await getAccount(
      provider.connection,
      takerTokenAccountA
    );

    let _afterInitialize_escrow_account_pda_serialized =
      await program.account.escrowAccount.fetch(escrow_account_pda);

    assert.ok(_afterInitialize_vault.owner.equals(vault_authority_pda));
    assert.ok(
      _afterInitialize_escrow_account_pda_serialized.initializerKey.equals(
        takerWallet.publicKey
      )
    );
    assert.ok(
      _afterInitialize_escrow_account_pda_serialized.initializerReleaseTokenAccount.equals(
        takerTokenAccountA
      )
    );
    assert.ok(
      _afterInitialize_escrow_account_pda_serialized.initializerReceiveTokenAccount.equals(
        takerTokenAccountB
      )
    );
    assert.ok(Number(_afterInitialize_vault.amount) == initializerAmount);
    assert.ok(Number(_afterInitialize_takerTokenAccountA.amount) == 0);

    await program.methods
      .cancel()
      .accounts({
        initializer: takerWallet.publicKey,
        vaultAccount: vault_account_pda,
        vaultAuthority: vault_authority_pda,
        initializerReleaseTokenAccount: takerTokenAccountA,
        escrowAccount: escrow_account_pda,
      })
      .signers([takerWallet])
      .rpc();

    let _afterExchange_takerTokenAccountA = await getAccount(
      provider.connection,
      takerTokenAccountA
    );

    // Check all the funds are still there.
    assert.ok(
      Number(_afterExchange_takerTokenAccountA.amount) == initializerAmount
    );
  });
});
