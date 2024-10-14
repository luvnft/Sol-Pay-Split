"use client";

import React, { useEffect, useState } from "react";
import { BackgroundLines } from "@/components/ui/background-lines";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Idl, Program, web3, BN } from "@coral-xyz/anchor";
import idl from "../../../anchor/target/idl/payment_splitter.json";

export default function Payment() {
  const wallet = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [input, setInput] = useState("");

  type SolanaWallet = WalletContextState & {
    publicKey: PublicKey;
    signTransaction(tx: web3.Transaction): Promise<web3.Transaction>;
    signAllTransactions(txs: web3.Transaction[]): Promise<web3.Transaction[]>;
  };

  const opts: web3.ConnectionConfig = { commitment: 'processed' };
  const connection = new Connection(clusterApiUrl('devnet'), opts.commitment);

  const provider = new AnchorProvider(
    connection,
    wallet as SolanaWallet,
    {
      preflightCommitment: opts.commitment,
      commitment: opts.commitment,
    }
  );

  const program = new Program<Idl>(idl as Idl, provider);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInputChange = (e: any) => {
    const value = e.target.value;

    // Regex to accept only numbers as input
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value)) {
      setInput(value);
    }
  };

  const Initialize = async () => {
    if (wallet.publicKey) {
      try {
        const totalAmount = new BN(Number(input) * web3.LAMPORTS_PER_SOL); // Convert SOL to lamports
        const [escrowPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .initialize(totalAmount)
          .accounts({
            escrowAccount: escrowPDA,
            sender: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Escrow account initialized!");
      } catch (error) {
        console.error("Error initializing escrow:", error);
      }
    } else {
      console.log("Wallet not connected");
    }
  };

  // Solves hydration error
  if (!isMounted) {
    return null;
  }

  return (
    <BackgroundLines
      svgOptions={{ duration: 3 }}
      className="flex items-center justify-center w-full flex-col px-4"
    >
      <div className="w-[60%] h-[60%] bg-white/10 backdrop-blur-md rounded-lg p-8 shadow-lg flex flex-col justify-center items-center space-y-6">
        {wallet.publicKey ? (
          <div className="text-center">
            <h4 className="text-white text-3xl font-bold mb-4">
              Connected Wallet:
            </h4>
            <p className="text-white text-lg mb-6">
              {wallet.publicKey.toBase58()}
            </p>
            <h2 className="text-white text-xl font-semibold mb-2">
              Enter Total Amount:
            </h2>
            <input
              type="number"
              className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              placeholder="Amount in SOL"
              value={input}
              onChange={handleInputChange}
            />
            {input ? (
              <button
                onClick={Initialize}
                className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 mt-6 rounded-lg transition duration-300 hover:from-green-500 hover:to-green-700"
              >
                Initialize
              </button>
            ) : (
              <p className="text-white">Enter some amount</p>
            )}
          </div>
        ) : (
          <h4 className="text-white text-2xl font-bold">No Wallet Connected</h4>
        )}
      </div>
    </BackgroundLines>
  );
}
