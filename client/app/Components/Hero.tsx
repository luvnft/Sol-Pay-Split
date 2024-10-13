"use client";

import React, { useEffect, useState } from "react";
import { BackgroundLines } from "@/components/ui/background-lines";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";

export function Hero() {
  const wallet = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Set the component as mounted after the first render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Prevent rendering wallet-related UI until after the component has mounted
    return null;
  }

  function handleClick(){
    router.push("/payment");
  }

  return (
    <BackgroundLines
      svgOptions={{ duration: 3 }}
      className="flex items-center justify-center w-full flex-col px-4"
    >
      <h2 className="bg-clip-text text-transparent text-center text-white text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-sans py-2 sm:py-4 md:py-10 relative z-20 font-bold tracking-tight">
        <p className="bg-gradient-to-r from-purple-400 via-purple-500 to-purple-700 bg-clip-text text-transparent">
          Solana
        </p>
        Payment Splitter
      </h2>
      <p className="max-w-xl mx-auto text-sm sm:text-base md:text-lg text-neutral-400 text-center mt-2 sm:mt-4">
        Make multiple transactions in one go
      </p>

      {wallet.publicKey ? (
        <div className="flex flex-col items-center space-y-4 mt-10">
        <button className="relative p-[3px]" onClick={handleClick}>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg pointer-events-none" />
          <div className="relative px-8 py-2 bg-black rounded-[6px] group transition duration-200 text-white hover:bg-transparent z-10">
            Pay Now!
          </div>
        </button>
      
        {/* Wallet Disconnect Button */}
        <div className="relative z-10">
          <WalletDisconnectButton className="bg-black text-white p-2 rounded-lg" />
        </div>
      </div>
      
      
      ) : (
        <div className="p-[3px] relative mt-10">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg" />
          <div className="bg-black rounded-[6px] relative group transition duration-200 text-white hover:bg-transparent">
            <WalletMultiButton />
          </div>
        </div>
      )}
    </BackgroundLines>
  );
}
