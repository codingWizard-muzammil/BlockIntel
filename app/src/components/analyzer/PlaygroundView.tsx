"use client";

import { useEffect, useState } from "react";
import {
  Blocks,
  CircleAlert,
  CircleCheck,
  Eye,
  FlaskConical,
  Loader2,
  Pencil,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Card, CardHeading } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChainIcon } from "@/components/editor/chain-icons";
import { PrivateKeyRow } from "@/components/wallet/PrivateKeyRow";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { CHAIN_SYMBOLS } from "@/store/wallet-store";
import { usePlaygroundWalletBalance } from "@/hooks/usePlaygroundWalletBalance";
import { mintWalletRequest } from "@/api/wallet";
import type { AbiFragment, DeployedDependency, DeploymentResult, PlaygroundWallet } from "@/api/contracts";

function isReadOnly(fragment: AbiFragment) {
  return fragment.stateMutability === "view" || fragment.stateMutability === "pure";
}

function FunctionCard({
  contractId,
  fragment,
  onBalanceChange,
}: {
  contractId: string;
  fragment: AbiFragment;
  onBalanceChange: (balance: string) => void;
}) {
  const { callContractFunction } = useProjectStore();
  const [values, setValues] = useState<string[]>(() => fragment.inputs.map(() => ""));
  const [ethValue, setEthValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  const write = !isReadOnly(fragment);
  const payable = fragment.stateMutability === "payable";

  async function handleCall() {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const response = await callContractFunction(contractId, {
        functionName: fragment.signature ?? fragment.name ?? "",
        args: values,
        valueWei: payable && ethValue.trim() ? ethValue.trim() : undefined,
      });
      if (response.walletBalance) onBalanceChange(response.walletBalance);
      if (response.txHash) {
        setOutput(`tx ${response.txHash} · gas ${response.gasUsed ?? "?"}`);
      } else if (response.result === null || response.result === undefined) {
        setOutput("(no return value)");
      } else {
        setOutput(JSON.stringify(response.result));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-ink">{fragment.name}</span>
        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {fragment.stateMutability}
        </span>
      </div>

      {fragment.inputs.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {fragment.inputs.map((input, i) => (
            <input
              key={`${input.name || "arg"}-${i}`}
              placeholder={`${input.name || `arg${i}`} (${input.type})`}
              value={values[i]}
              onChange={(e) =>
                setValues((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
              }
              className="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
          ))}
        </div>
      )}

      {payable && (
        <input
          placeholder="value (wei)"
          value={ethValue}
          onChange={(e) => setEthValue(e.target.value)}
          className="mb-3 w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
        />
      )}

      <Button size="sm" variant={write ? "primary" : "secondary"} onClick={handleCall} disabled={loading}>
        {loading && <Loader2 className="size-3 animate-spin" />}
        {write ? "Send" : "Call"}
      </Button>

      {error && <p className="mt-2 break-all text-xs text-danger">{error}</p>}
      {output && <p className="mt-2 break-all font-mono text-xs text-success">{output}</p>}
    </div>
  );
}

export function PlaygroundView() {
  const { compileStatus: status, files, activeFileId } = useEditorStore();
  const activeContractId =
    files.find((f) => f.id === activeFileId)?.contractId ?? null;

  if (status.unsupported) {
    return (
      <ComingSoon
        icon={FlaskConical}
        title="Playground"
        description="Compilation for this language isn't supported yet, so there's nothing to deploy or simulate here."
      />
    );
  }

  if (!status.ok || !status.contractId) {
    return (
      <ComingSoon
        icon={FlaskConical}
        title="Playground"
        description="Compile & analyze your contract to simulate transactions against it here."
      />
    );
  }

  if (status.contractId !== activeContractId) {
    return (
      <ComingSoon
        icon={FlaskConical}
        title="Different file open"
        description="This tab hasn't been compiled yet — hit Compile & Analyze to bring up its playground."
      />
    );
  }

  return (
    <PlaygroundBody
      key={status.contractId}
      contractId={status.contractId}
      contractName={status.contractName}
      deployment={status.deployment}
      abi={status.abi ?? []}
    />
  );
}

// A dependency the constructor deployed itself (e.g. Vault's
// `new Strategy(...)`) is clickable when it's also an open tab in this
// project — its own playground already reflects the same deployed address
// (see setCompileResult), so this just jumps there.
function DependencyRow({ dependency }: { dependency: DeployedDependency }) {
  const { setActiveFile, files } = useEditorStore();
  const fileId =
    files.find((f) => f.contractId === dependency.contractId)?.id ?? null;

  const content = (
    <>
      <span className="text-ink">{dependency.name ?? "Contract"}</span>
      <span className="font-mono text-[11px] text-muted">{dependency.address}</span>
    </>
  );

  if (!fileId) {
    return <div className="flex items-center justify-between gap-2 px-1.5 py-1 text-xs">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => setActiveFile(fileId)}
      className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-muted"
    >
      {content}
    </button>
  );
}

// Keyed by contractId in the parent, so switching to a different compiled
// tab remounts this (and its local wallet state) instead of needing a
// synchronous reset inside an effect.
function PlaygroundBody({
  contractId,
  contractName,
  deployment,
  abi,
}: {
  contractId: string;
  contractName: string | null;
  deployment: DeploymentResult | null;
  abi: AbiFragment[];
}) {
  const { fetchPlaygroundWallet } = useProjectStore();
  const [wallet, setWallet] = useState<PlaygroundWallet | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const deployed = Boolean(deployment?.ok && deployment.address);

  async function handleMint() {
    if (!deployment?.chain) return;
    setMinting(true);
    setMintError(null);
    try {
      const result = await mintWalletRequest(deployment.chain);
      setWallet((w) => (w ? { ...w, balance: result.balance } : w));
    } catch (err) {
      setMintError((err as Error).message);
    } finally {
      setMinting(false);
    }
  }
  const readFns = abi.filter((f) => f.type === "function" && isReadOnly(f));
  const writeFns = abi.filter((f) => f.type === "function" && !isReadOnly(f));

  // Fetch (and, on the backend, auto-fund) the connected user's own
  // playground wallet as soon as their contract is up, so a "before" balance
  // is already visible ahead of any deposit/withdraw call.
  useEffect(() => {
    if (!deployed) return;
    let cancelled = false;
    fetchPlaygroundWallet(contractId).then((w) => {
      if (!cancelled) setWallet(w);
    });
    return () => {
      cancelled = true;
    };
  }, [contractId, deployed, fetchPlaygroundWallet]);

  // Live balance push over WebSocket — catches changes from any source
  // (an external wallet send, a faucet top-up), not just calls made here.
  usePlaygroundWalletBalance(deployed ? contractId : null, (balance) =>
    setWallet((w) => (w ? { ...w, balance } : w)),
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeading icon={FlaskConical}>Deployment</CardHeading>
        {deployed && deployment ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-success">
              <CircleCheck className="size-4" />
              {contractName} deployed to a local {deployment.chain} node
            </div>
            <div className="flex items-center gap-2 text-muted">
              <ChainIcon chain={deployment.chain} className="size-3.5" />
              <span className="font-mono text-xs text-ink">{deployment.address}</span>
            </div>
            {deployment.dependencies && deployment.dependencies.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Blocks className="size-3.5" />
                  Dependencies also deployed
                </span>
                {deployment.dependencies.map((dependency) => (
                  <DependencyRow key={dependency.address} dependency={dependency} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{deployment?.error ?? "This contract wasn't deployed."}</span>
          </div>
        )}
      </Card>

      {deployed && (
        <Card>
          <CardHeading icon={Wallet} size="md">
            Your test wallet
          </CardHeading>
          {wallet ? (
            <>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs text-ink">{wallet.address}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">
                    {wallet.balance} {deployment?.chain ? CHAIN_SYMBOLS[deployment.chain] : ""}
                  </span>
                  <Button size="sm" variant="secondary" disabled={minting} onClick={handleMint}>
                    {minting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    Mint +100 {deployment?.chain ? CHAIN_SYMBOLS[deployment.chain] : ""}
                  </Button>
                </div>
              </div>
              {mintError && <p className="mt-1 text-xs text-danger">{mintError}</p>}
              <div className="mt-3">
                <PrivateKeyRow privateKey={wallet.privateKey} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Funding your wallet on the local node…</p>
          )}
          <p className="mt-2 text-xs text-muted">
            Every call below runs as this address, and its balance updates live — call a
            read function to check a value, then a write function, then check it again. Import
            the private key above into MetaMask or Phantom to interact with it directly — it
            only ever holds fake ETH on this local test node, never use it for real funds.
          </p>
        </Card>
      )}

      {deployed && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeading icon={Eye} size="md">
              Read
            </CardHeading>
            <div className="flex flex-col gap-3">
              {readFns.length === 0 ? (
                <p className="text-sm text-muted">No read-only functions.</p>
              ) : (
                readFns.map((fn) => (
                  <FunctionCard
                    key={fn.signature}
                    contractId={contractId}
                    fragment={fn}
                    onBalanceChange={(balance) =>
                      setWallet((w) => (w ? { ...w, balance } : w))
                    }
                  />
                ))
              )}
            </div>
          </Card>
          <Card>
            <CardHeading icon={Pencil} size="md">
              Write
            </CardHeading>
            <div className="flex flex-col gap-3">
              {writeFns.length === 0 ? (
                <p className="text-sm text-muted">No write functions.</p>
              ) : (
                writeFns.map((fn) => (
                  <FunctionCard
                    key={fn.signature}
                    contractId={contractId}
                    fragment={fn}
                    onBalanceChange={(balance) =>
                      setWallet((w) => (w ? { ...w, balance } : w))
                    }
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
