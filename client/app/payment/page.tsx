"use client";

import React, { useEffect, useState } from "react";
import { BackgroundLines } from "@/components/ui/background-lines";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Idl, Program, web3, BN } from "@coral-xyz/anchor";
import idl from "../../../anchor/target/idl/payment_splitter.json";
import { Modal } from "../Components/Modal";
import { FaTrash } from "react-icons/fa";

export default function Payment() {
  const wallet = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [input, setInput] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState("");
  const [recipientAmount, setRecipientAmount] = useState("");
  const [recipients, setRecipients] = useState<Map<string, number>>(new Map());

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
    checkEscrowAccount();
  }, []);

  const checkEscrowAccount = async () => {
    if (wallet.publicKey) {
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
        program.programId
      );
  
      const escrowAccountInfo = await connection.getAccountInfo(escrowPDA);
      if (escrowAccountInfo) {
        const escrowAccount = await program.account.escrowAccount.fetch(escrowPDA);
        const totalAmountInLamports = new BN(escrowAccount.totalAmount.words);
        console.log(totalAmountInLamports / LAMPORTS_PER_SOL);
        setIsInitialized(true);
      }
    }
  };

  const handleConfirmRecipients = async () => {
    if (wallet.publicKey && recipients.size > 0) {
      try {
        const [escrowPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
          program.programId
        );
  
        // Convert the recipients map to an array of objects
        const recipientsArray = Array.from(recipients.entries()).map(([key, amount]) => ({
          recipient: new PublicKey(key),
          amount: new BN(amount * LAMPORTS_PER_SOL), // Convert SOL to lamports
        }));
  
        // Send the recipients array to the blockchain
        await program.methods
          .addRecipients(recipientsArray)
          .accounts({
            escrowAccount: escrowPDA,
            sender: wallet.publicKey,
          })
          .rpc();
  
        console.log("Recipients added successfully!");
        setIsModalOpen(false); // Close the modal after confirmation
      } catch (error) {
        console.error("Error adding recipients:", error);
        alert("Failed to add recipients. Please try again.");
      }
    } else {
      console.log("No recipients to add or wallet not connected");
      alert("Please connect your wallet and add recipients before confirming.");
    }
  };
  

  const handleDeleteRecipient = (publicKey: string) => {
    setRecipients(prev => {
      const updatedRecipients = new Map(prev);
      updatedRecipients.delete(publicKey);
      return updatedRecipients;
    });
  };

  const handleInputChange = (e: any) => {
    const value = e.target.value;
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value)) {
      setInput(value);
    }
  };

  const handleRecipientPublicKeyChange = (e: any) => {
    setRecipientPublicKey(e.target.value);
  };

  const handleRecipientAmountChange = (e: any) => {
    const value = e.target.value;
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value)) {
      setRecipientAmount(value);
    }
  };

  const handleAddRecipient = () => {
    if (recipientPublicKey && recipientAmount) {
      setRecipients(prev => new Map(prev).set(recipientPublicKey, parseFloat(recipientAmount)));
      setRecipientPublicKey("");
      setRecipientAmount("");
    }
  };

  const handleDelete = async () => {
    if (wallet.publicKey) {
      try {
        const [escrowPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .delete()
          .accounts({
            escrowAccount: escrowPDA,
            sender: wallet.publicKey,
          })
          .rpc();

        console.log("Escrow account deleted!");
        setIsInitialized(false); // Reset the initialized state
      } catch (error) {
        console.error("Error deleting escrow account:", error);
      }
    } else {
      console.log("Wallet not connected");
    }
  };

  const Initialize = async () => {
    if (wallet.publicKey && !isInitialized) {
      try {
        const totalAmount = new BN(Number(input) * web3.LAMPORTS_PER_SOL);
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
        setIsInitialized(true);
      } catch(err) {
        console.log(err);
      }
    }
  };

  const handleMakePaymentClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

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
              disabled={isInitialized}
              onChange={handleInputChange}
            />
            {input ? (
              <button
                onClick={Initialize}
                className="bg-gradient-to-r mx-5 from-green-400 to-green-600 text-white px-4 py-2 mt-6 rounded-lg transition duration-300 hover:from-green-500 hover:to-green-700 mb-4"
                disabled={isInitialized}
              >
                Initialize
              </button>
            ) : (
              <p className="text-white">Enter some amount</p>
            )}
            {isInitialized && (
              <>
                <button
                  onClick={handleMakePaymentClick}
                  className="bg-gradient-to-r mx-5 from-purple-400 to-purple-600 text-white px-4 py-2 mt-6 rounded-lg transition duration-300 hover:from-blue-500 hover:to-blue-700 mb-4"
                >
                  Make Payment
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-gradient-to-r mx-5 from-red-400 to-red-600 text-white px-4 py-2 mt-6 rounded-lg transition duration-300 hover:from-red-500 hover:to-red-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ) : (
          <h4 className="text-white text-2xl font-bold">No Wallet Connected</h4>
        )}
      </div>

      
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-xl font-bold mb-4">Add Recipients</h2>
        <input
          type="text"
          className="w-full p-3 mb-4 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Recipient Public Key"
          value={recipientPublicKey}
          onChange={handleRecipientPublicKeyChange}
        />
        <input
          type="number"
          className="w-full p-3 mb-4 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Amount in SOL"
          value={recipientAmount}
          onChange={handleRecipientAmountChange}
        />
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleAddRecipient}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 rounded-lg transition duration-300 hover:from-green-500 hover:to-green-700"
          >
            Add
          </button>
          <button
          onClick={handleConfirmRecipients}
            className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-2 rounded-lg transition duration-300 hover:from-blue-500 hover:to-blue-700"
          >
            Confirm
          </button>
        </div>
        <div className="mt-6 p-4 bg-gray-800 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold text-white mb-2">Recipients List</h3>
          {recipients.size > 0 ? (
            <ul className="space-y-2">
              {Array.from(recipients.entries()).map(([key, amount], index) => (
                <li key={index} className="text-white flex justify-between items-center">
                  <div>
                    <span className="font-bold">Public Key:</span> {key} <br />
                    <span className="font-bold">Amount:</span> {amount} SOL
                  </div>
                  <button
                    onClick={() => handleDeleteRecipient(key)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white">No recipients added yet.</p>
          )}
        </div>
</Modal>

    </BackgroundLines>
  );
}



// exytS6zzAEgnp5MHehHV5G28CDQxWyU4bMvzXdYmGGK
// 6Eo9TkNmkfzHALnk9G5VU9enTznye2MjyRZ1mUBZieW5