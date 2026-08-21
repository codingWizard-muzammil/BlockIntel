export type ChainFamily = "ethereum" | "solana";

export const CHAIN_LABELS: Record<ChainFamily, string> = {
  ethereum: "Ethereum",
  solana: "Solana",
};

export type WalletProviderDetail = {
  id: string;
  name: string;
  icon?: string;
  chain: ChainFamily;
  connect: () => Promise<{ address: string }>;
  sign: (address: string, message: string) => Promise<string>;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Ethereum / EVM wallets, discovered via EIP-6963 (the multi-wallet standard
// MetaMask, Coinbase, Rabby, etc. all implement) with a legacy
// window.ethereum fallback for wallets that predate it.
// ---------------------------------------------------------------------------

type InjectedEvmProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
  isRabby?: boolean;
  providers?: InjectedEvmProvider[];
};

type EIP6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: InjectedEvmProvider;
};

function makeEvmWalletDetail(
  id: string,
  name: string,
  icon: string | undefined,
  provider: InjectedEvmProvider,
): WalletProviderDetail {
  return {
    id,
    name,
    icon,
    chain: "ethereum",
    connect: async () => {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No account authorized by wallet.");
      return { address };
    },
    sign: async (address, message) =>
      (await provider.request({
        method: "personal_sign",
        params: [message, address],
      })) as string,
  };
}

function legacyEvmProviderName(provider: InjectedEvmProvider): string {
  if (provider.isMetaMask) return "MetaMask";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isBraveWallet) return "Brave Wallet";
  if (provider.isRabby) return "Rabby";
  return "Injected Wallet";
}

function legacyEvmFallback(): WalletProviderDetail[] {
  const ethereum = (window as unknown as { ethereum?: InjectedEvmProvider }).ethereum;
  if (!ethereum) return [];

  const candidates = ethereum.providers?.length ? ethereum.providers : [ethereum];
  return candidates.map((provider, index) =>
    makeEvmWalletDetail(`legacy-evm-${index}`, legacyEvmProviderName(provider), undefined, provider),
  );
}

function discoverEvmWallets(): Promise<WalletProviderDetail[]> {
  return new Promise((resolve) => {
    const found = new Map<string, WalletProviderDetail>();

    function handleAnnouncement(event: Event) {
      const { detail } = event as CustomEvent<EIP6963ProviderDetail>;
      found.set(
        detail.info.uuid,
        makeEvmWalletDetail(detail.info.uuid, detail.info.name, detail.info.icon, detail.provider),
      );
    }

    window.addEventListener("eip6963:announceProvider", handleAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
      resolve(found.size > 0 ? Array.from(found.values()) : legacyEvmFallback());
    }, 200);
  });
}

// ---------------------------------------------------------------------------
// Solana wallets, discovered via the Wallet Standard (the cross-wallet
// protocol Phantom, Solflare, Backpack, etc. all implement) with a legacy
// window.solana / window.solflare fallback for older injections.
// ---------------------------------------------------------------------------

type SolanaWalletAccount = {
  address: string;
  publicKey: Uint8Array;
};

type StandardWalletFeature = {
  connect?: () => Promise<{ accounts: SolanaWalletAccount[] }>;
  signMessage?: (input: {
    account: SolanaWalletAccount;
    message: Uint8Array;
  }) => Promise<{ signature: Uint8Array }[]>;
};

type StandardWallet = {
  name: string;
  icon?: string;
  chains: readonly string[];
  features: Record<string, StandardWalletFeature>;
  accounts: readonly SolanaWalletAccount[];
};

type RegisterWalletApi = { register: (...wallets: StandardWallet[]) => void };

function isSolanaStandardWallet(wallet: StandardWallet): boolean {
  return wallet.chains.some((chain) => chain.startsWith("solana:"));
}

function makeSolanaWalletDetail(wallet: StandardWallet): WalletProviderDetail {
  return {
    id: `solana-standard-${wallet.name}`,
    name: wallet.name,
    icon: wallet.icon,
    chain: "solana",
    connect: async () => {
      const connect = wallet.features["standard:connect"]?.connect;
      if (!connect) throw new Error(`${wallet.name} does not support connecting.`);
      const { accounts } = await connect();
      const account = accounts[0];
      if (!account) throw new Error("No account authorized by wallet.");
      return { address: account.address };
    },
    sign: async (address, message) => {
      const signMessage = wallet.features["solana:signMessage"]?.signMessage;
      if (!signMessage) throw new Error(`${wallet.name} does not support message signing.`);
      const account = wallet.accounts.find((a) => a.address === address) ?? wallet.accounts[0];
      const [output] = await signMessage({
        account,
        message: new TextEncoder().encode(message),
      });
      return bytesToHex(output.signature);
    },
  };
}

function discoverSolanaStandardWallets(): Promise<WalletProviderDetail[]> {
  return new Promise((resolve) => {
    const found = new Map<string, StandardWallet>();

    function register(...wallets: StandardWallet[]) {
      for (const wallet of wallets) {
        if (isSolanaStandardWallet(wallet)) found.set(wallet.name, wallet);
      }
    }

    window.addEventListener("wallet-standard:register-wallet", (event) => {
      const callback = (event as CustomEvent<(api: RegisterWalletApi) => void>).detail;
      callback({ register });
    });

    window.dispatchEvent(
      new CustomEvent("wallet-standard:app-ready", { detail: Object.freeze({ register }) }),
    );

    setTimeout(() => {
      resolve(Array.from(found.values()).map(makeSolanaWalletDetail));
    }, 200);
  });
}

type PhantomLegacyProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array }>;
};

type SolflareLegacyProvider = {
  isSolflare?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
};

function legacySolanaFallback(): WalletProviderDetail[] {
  const win = window as unknown as {
    solana?: PhantomLegacyProvider;
    solflare?: SolflareLegacyProvider;
  };
  const results: WalletProviderDetail[] = [];

  if (win.solana?.isPhantom) {
    const phantom = win.solana;
    results.push({
      id: "legacy-phantom",
      name: "Phantom",
      chain: "solana",
      connect: async () => ({ address: (await phantom.connect()).publicKey.toString() }),
      sign: async (_address, message) => {
        const { signature } = await phantom.signMessage(new TextEncoder().encode(message), "utf8");
        return bytesToHex(signature);
      },
    });
  }

  if (win.solflare?.isSolflare) {
    const solflare = win.solflare;
    results.push({
      id: "legacy-solflare",
      name: "Solflare",
      chain: "solana",
      connect: async () => {
        await solflare.connect();
        const address = solflare.publicKey?.toString();
        if (!address) throw new Error("No account authorized by wallet.");
        return { address };
      },
      sign: async (_address, message) => {
        const { signature } = await solflare.signMessage(new TextEncoder().encode(message));
        return bytesToHex(signature);
      },
    });
  }

  return results;
}

async function discoverSolanaWallets(): Promise<WalletProviderDetail[]> {
  const standard = await discoverSolanaStandardWallets();
  return standard.length > 0 ? standard : legacySolanaFallback();
}

// ---------------------------------------------------------------------------

export async function discoverWalletProviders(): Promise<WalletProviderDetail[]> {
  const [evm, solana] = await Promise.all([discoverEvmWallets(), discoverSolanaWallets()]);
  return [...evm, ...solana];
}
