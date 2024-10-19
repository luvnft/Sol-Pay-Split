import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles for wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

export const useSolanaWallet = (network: WalletAdapterNetwork | 'localnet' = 'localnet') => {
    // Set the network, using localnet if specified
    const endpoint = useMemo(() => {
        if (network === 'localnet') {
            return 'http://127.0.0.1:8899'; // Localnet endpoint
        } else {
            return clusterApiUrl(network); // Other networks (Devnet, Testnet, Mainnet)
        }
    }, [network]);

    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    // Custom hook returns JSX wrapping the component tree with the necessary providers
    return function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
        return (
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>
                        {children}
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        );
    };
};
