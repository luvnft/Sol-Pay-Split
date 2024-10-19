"use client";

import localFont from "next/font/local";
import "./globals.css";
import { useSolanaWallet } from "./WalletProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});


// export const metadata: Metadata = {
  //   title: "Solana Payment Splitter",
  //   description: "A payment app based on solana blockchain made with Aceternity UI",
  // };
  
  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  const WalletProvider = useSolanaWallet();
  return (
    <html lang="en">
      <head>
        <title>Solana Payment</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
