"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Eye, FlaskConical, Loader2, Pencil } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Card, CardHeading } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChainIcon } from "@/components/editor/chain-icons";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { AbiFragment } from "@/api/contracts";

function isReadOnly(fragment: AbiFragment) {
  return fragment.stateMutability === "view" || fragment.stateMutability === "pure";
}

function FunctionCard({ contractId, fragment }: { contractId: string; fragment: AbiFragment }) {
  const callContractFunction = useProjectStore((s) => s.callContractFunction);
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
  const status = useEditorStore((s) => s.compileStatus);
  const activeContractId = useEditorStore(
    (s) => s.files.find((f) => f.id === s.activeFileId)?.contractId ?? null,
  );

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

  const contractId = status.contractId;
  const deployment = status.deployment;
  const abi = status.abi ?? [];
  const readFns = abi.filter((f) => f.type === "function" && isReadOnly(f));
  const writeFns = abi.filter((f) => f.type === "function" && !isReadOnly(f));
  const deployed = Boolean(deployment?.ok && deployment.address);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeading icon={FlaskConical}>Deployment</CardHeading>
        {deployed && deployment ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-success">
              <CircleCheck className="size-4" />
              {status.contractName} deployed to a local {deployment.chain} node
            </div>
            <div className="flex items-center gap-2 text-muted">
              <ChainIcon chain={deployment.chain} className="size-3.5" />
              <span className="font-mono text-xs text-ink">{deployment.address}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{deployment?.error ?? "This contract wasn't deployed."}</span>
          </div>
        )}
      </Card>

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
                  <FunctionCard key={fn.signature} contractId={contractId} fragment={fn} />
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
                  <FunctionCard key={fn.signature} contractId={contractId} fragment={fn} />
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
