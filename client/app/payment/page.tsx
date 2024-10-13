"use client";

import React, { useEffect, useState } from "react";
import { BackgroundLines } from "@/components/ui/background-lines";
import { useWallet } from "@solana/wallet-adapter-react";

export default function Payment() {
  const { publicKey } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [input, setInput] = useState("");


  useEffect(() => {
    setIsMounted(true);
  }, []);

  
  const handleInputChange = (e) => {
    const value = e.target.value;

    
    const regex = /^\d*\.?\d*$/; 
    if (regex.test(value)) {
      setInput(value); 
    }
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
        {publicKey ? (
          <div className="text-center">
            <h4 className="text-white text-3xl font-bold mb-4">
              Connected Wallet:
            </h4>
            <p className="text-white text-lg mb-6">
              {publicKey.toBase58()}
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
  <button className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 mt-6 rounded-lg transition duration-300 hover:from-green-500 hover:to-green-700">
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
