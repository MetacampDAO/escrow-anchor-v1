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
  let vault_authority_pda: PublicKey;
  let vault_account_pda_mintA: PublicKey;
  let vault_account_pda_mintB: PublicKey;
  let escrow_account_pda_mintA: PublicKey;
  let escrow_account_pda_mintB: PublicKey;

  const takerAmount = 1000;
  const initializerAmount = 500;

  const mintAuthority = anchor.web3.Keypair.generate();
  const initializerWallet = anchor.web3.Keypair.generate();
  const takerWallet = anchor.web3.Keypair.generate();

  it("Initialize program state", async () => {
    // INITIALIZER: 500 (A), 1000 (B)
    // TAKER: 500 (A), 1000 (B)

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
      takerTokenAccountA,
      mintAuthority,
      initializerAmount
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
      initializerTokenAccountB,
      mintAuthority,
      takerAmount
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

    assert.ok(Number(_initializerTokenAccountB.amount) == takerAmount);
    assert.ok(
      _initializerTokenAccountB.owner.equals(initializerWallet.publicKey)
    );
    assert.ok(_initializerTokenAccountB.mint.equals(mintB));

    assert.ok(Number(_takerTokenAccountA.amount) == initializerAmount);
    assert.ok(_takerTokenAccountA.owner.equals(takerWallet.publicKey));
    assert.ok(_takerTokenAccountA.mint.equals(mintA));

    assert.ok(Number(_takerTokenAccountB.amount) == takerAmount);
    assert.ok(_takerTokenAccountB.owner.equals(takerWallet.publicKey));
    assert.ok(_takerTokenAccountB.mint.equals(mintB));
  });

  it("Initialize escrow - trade #1 & #2", async () => {
    // INITIALIZER TO INITIALIZE TWO DIFFERENT ESCROW TRADE
    // TRADE #1 INITIALIZER TRADE 500 (A) FOR 1000 (B) WITH MIN. 100 (B)
    // TRADE #2 INITIALIZER TRADE 1000 (B) FOR 500 (A) WITH MIN. 100 (A)

    const [_vault_authority_pda] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("vault-authority"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    const [_vault_account_pda_mintA] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("vault-account")),
        initializerWallet.publicKey.toBuffer(),
        mintA.toBuffer(),
      ],
      program.programId
    );
    vault_account_pda_mintA = _vault_account_pda_mintA;

    const [_vault_account_pda_mintB] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("vault-account")),
        initializerWallet.publicKey.toBuffer(),
        mintB.toBuffer(),
      ],
      program.programId
    );
    vault_account_pda_mintB = _vault_account_pda_mintB;

    const [_escrow_account_pda_mintA] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("escrow-account")),
        initializerWallet.publicKey.toBuffer(),
        mintA.toBuffer(),
      ],
      program.programId
    );
    escrow_account_pda_mintA = _escrow_account_pda_mintA;

    const [_escrow_account_pda_mintB] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("escrow-account")),
        initializerWallet.publicKey.toBuffer(),
        mintB.toBuffer(),
      ],
      program.programId
    );
    escrow_account_pda_mintB = _escrow_account_pda_mintB;

    await program.methods
      .initialize(new anchor.BN(initializerAmount), new anchor.BN(takerAmount))
      .accounts({
        initializer: initializerWallet.publicKey,
        mint: mintA,
        vaultAccount: vault_account_pda_mintA,
        vaultAuthority: vault_authority_pda,
        initializerReleaseTokenAccount: initializerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        escrowAccount: escrow_account_pda_mintA,
      })
      .signers([initializerWallet])
      .rpc();

    await program.methods
      .initialize(new anchor.BN(takerAmount), new anchor.BN(initializerAmount))
      .accounts({
        initializer: initializerWallet.publicKey,
        mint: mintB,
        vaultAccount: vault_account_pda_mintB,
        vaultAuthority: vault_authority_pda,
        initializerReleaseTokenAccount: initializerTokenAccountB,
        initializerReceiveTokenAccount: initializerTokenAccountA,
        escrowAccount: escrow_account_pda_mintB,
      })
      .signers([initializerWallet])
      .rpc();

    let _vault_mintA = await getAccount(
      provider.connection,
      vault_account_pda_mintA
    );
    let _vault_mintB = await getAccount(
      provider.connection,
      vault_account_pda_mintB
    );

    let _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );
    let _initializerTokenAccountB = await getAccount(
      provider.connection,
      initializerTokenAccountB
    );

    let _escrow_account_pda_mintA_serialized =
      await program.account.escrowAccount.fetch(escrow_account_pda_mintA);
    let _escrow_account_pda_mintB_serialized =
      await program.account.escrowAccount.fetch(escrow_account_pda_mintB);

    assert.ok(_vault_mintA.owner.equals(vault_authority_pda));
    assert.ok(_vault_mintB.owner.equals(vault_authority_pda));
    assert.ok(
      _escrow_account_pda_mintA_serialized.initializerKey.equals(
        initializerWallet.publicKey
      )
    );
    assert.ok(
      _escrow_account_pda_mintB_serialized.initializerKey.equals(
        initializerWallet.publicKey
      )
    );
    assert.ok(
      _escrow_account_pda_mintA_serialized.initializerReleaseTokenAccount.equals(
        initializerTokenAccountA
      )
    );
    assert.ok(
      _escrow_account_pda_mintA_serialized.initializerReceiveTokenAccount.equals(
        initializerTokenAccountB
      )
    );
    assert.ok(
      _escrow_account_pda_mintB_serialized.initializerReleaseTokenAccount.equals(
        initializerTokenAccountB
      )
    );
    assert.ok(
      _escrow_account_pda_mintB_serialized.initializerReceiveTokenAccount.equals(
        initializerTokenAccountA
      )
    );
    assert.ok(
      _escrow_account_pda_mintA_serialized.initializerAmount.toNumber() ==
        initializerAmount
    );
    assert.ok(
      _escrow_account_pda_mintA_serialized.takerAmount.toNumber() == takerAmount
    );
    assert.ok(
      _escrow_account_pda_mintB_serialized.initializerAmount.toNumber() ==
        takerAmount
    );
    assert.ok(
      _escrow_account_pda_mintB_serialized.takerAmount.toNumber() ==
        initializerAmount
    );
    assert.ok(Number(_vault_mintA.amount) == initializerAmount);
    assert.ok(Number(_vault_mintB.amount) == takerAmount);
    assert.ok(Number(_initializerTokenAccountA.amount) == 0);
    assert.ok(Number(_initializerTokenAccountB.amount) == 0);
  });

  it("Exchange escrow - partial trade #1", async () => {
    // INITIALIZER TRADE 500 (A) FOR 1000 (B)
    // TAKER OFFER 500 (B) FOR 250 (A)

    await program.methods
      .exchange(new anchor.BN(500))
      .accounts({
        taker: takerWallet.publicKey,
        takerReleaseTokenAccount: takerTokenAccountB,
        takerReceiveTokenAccount: takerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        initializer: initializerWallet.publicKey,
        escrowAccount: escrow_account_pda_mintA,
        vaultAccount: vault_account_pda_mintA,
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
    let _vaultAccountA = await getAccount(
      provider.connection,
      vault_account_pda_mintA
    );

    assert.ok(Number(_vaultAccountA.amount) == 250); // 500 - 250 (RELEASE)
    assert.ok(Number(_takerTokenAccountA.amount) == 750); // 500 + 250 (RECEIVED)
    assert.ok(Number(_takerTokenAccountB.amount) == 500); // 1000 - 500 (RELEASE)
    assert.ok(Number(_initializerTokenAccountB.amount) == 500); // 500 (RECEIVED)
  });

  it("Cancel escrow - partial trade #1", async () => {
    await program.methods
      .cancel()
      .accounts({
        initializer: initializerWallet.publicKey,
        vaultAccount: vault_account_pda_mintA,
        vaultAuthority: vault_authority_pda,
        initializerReleaseTokenAccount: initializerTokenAccountA,
        escrowAccount: escrow_account_pda_mintA,
      })
      .signers([initializerWallet])
      .rpc();

    let _afterExchange_initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );

    // Check all the funds are still there.
    assert.ok(Number(_afterExchange_initializerTokenAccountA.amount) == 750); // 500 (INITIAL) + 250 (REFUND)
  });

  it("Exchange escrow - complete trade #2", async () => {
    // INITIALIZER TRADE 1000 (B) FOR 500 (A)
    // TAKER OFFER 500 (A) FOR 1000 (A)

    await program.methods
      .exchange(new anchor.BN(initializerAmount))
      .accounts({
        taker: takerWallet.publicKey,
        takerReleaseTokenAccount: takerTokenAccountA,
        takerReceiveTokenAccount: takerTokenAccountB,
        initializerReceiveTokenAccount: initializerTokenAccountA,
        initializer: initializerWallet.publicKey,
        escrowAccount: escrow_account_pda_mintB,
        vaultAccount: vault_account_pda_mintB,
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
    let _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );

    assert.ok(Number(_takerTokenAccountA.amount) == 250); // 750 - 500 (RELEASE)
    assert.ok(Number(_takerTokenAccountB.amount) == 1500); // 500 + 1000 (RECEIVED)
    assert.ok(Number(_initializerTokenAccountA.amount) == 500); // 500 (RECEIVED)
  });
});
