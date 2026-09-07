"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Cpu,
  FileCode2,
  Gauge,
  GitBranch,
  Layers,
  ListChecks,
  Shield,
  Sparkles,
  Terminal,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Reveal } from "@/components/docs/Reveal";
import { CHAIN_LANGUAGES } from "@/store/editor-store";

const STEPS = [
  {
    icon: Wallet,
    title: "Connect a wallet",
    description:
      "Sign a nonce with any EIP-6963 or Wallet Standard wallet — no password, no session cookie, just a signature.",
  },
  {
    icon: FileCode2,
    title: "Write or paste a contract",
    description:
      "Pick a target chain and language in the editor. BlockIntel enforces valid chain/language pairs as you type.",
  },
  {
    icon: Terminal,
    title: "Compile",
    description:
      "Compile in place to get real gas estimates, line counts, and compiler diagnostics straight from the toolchain.",
  },
  {
    icon: Sparkles,
    title: "Get an AI analysis",
    description:
      "A summary, a function-by-function explainer, and severity-ranked improvements — cached until you change the source.",
  },
];

const FEATURES = [
  {
    icon: Layers,
    title: "Multi-chain, multi-language",
    description:
      "Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, and Avalanche today — write in Solidity or Vyper depending on the target.",
  },
  {
    icon: Wallet,
    title: "Wallet-native auth",
    description:
      "SIWE-style signature challenges for both Ethereum and Solana wallets. No email, no password to leak.",
  },
  {
    icon: Sparkles,
    title: "AI summary & explainer",
    description:
      "Plain-English purpose, visibility, and a flow-by-flow breakdown of every function the AI can find in your ABI.",
  },
  {
    icon: ListChecks,
    title: "Severity-ranked improvements",
    description:
      "Each suggestion ships with a reason and a concrete fix, tagged High, Medium, or Low so you know what to tackle first.",
  },
  {
    icon: Gauge,
    title: "Live compiler & gas info",
    description:
      "Lines of code and average gas are computed straight from your own compile — never guessed by the model.",
  },
  {
    icon: Cpu,
    title: "Built to stay up",
    description:
      "Analysis falls back across multiple AI providers automatically, so a single rate limit doesn't take the feature down.",
  },
];

const FAQ = [
  {
    question: "Which wallets can I use to sign in?",
    answer:
      "Any EIP-6963-compatible EVM wallet (MetaMask, Rabby, and friends are auto-discovered) or a Wallet Standard / legacy Solana wallet like Phantom or Solflare. There's no password — you just sign a one-time message.",
  },
  {
    question: "Is my contract source sent anywhere unexpected?",
    answer:
      "Your source is compiled and analyzed to generate the summary, explainer, and improvements you see in the editor. It isn't shared beyond what's needed to produce that analysis.",
  },
  {
    question: "What happens if I edit a contract after analyzing it?",
    answer:
      "BlockIntel re-analyzes automatically the next time it's needed — a cached analysis is only reused while it's still newer than your last compile.",
  },
  {
    question: "Why did an analysis take a while or need a retry?",
    answer:
      "Analysis runs on free-tier AI providers with their own rate limits. BlockIntel already retries across providers automatically — if every one is briefly saturated, just try again shortly after.",
  },
];

export default function DocsPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto scrollbar-editor">
        <Hero />
        <HowItWorks />
        <Features />
        <SupportedChains />
        <WhatYouGet />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border px-6 pt-20 pb-24">
      <div className="pointer-events-none absolute inset-0 -z-10 docs-grid-bg" />
      <div className="pointer-events-none absolute -top-24 left-1/4 -z-10 size-72 rounded-full bg-accent/25 blur-3xl animate-docs-blob" />
      <div
        className="pointer-events-none absolute top-10 right-1/4 -z-10 size-64 rounded-full bg-success/20 blur-3xl animate-docs-blob"
        style={{ animationDelay: "-5s" }}
      />

      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <Reveal className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <Sparkles className="size-3.5 text-accent" />
          AI-powered smart contract security
        </Reveal>

        <Reveal delay={100}>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Understand every contract{" "}
            <span className="bg-linear-to-r from-accent via-success to-accent bg-clip-text text-transparent animate-docs-gradient">
              before you ship it
            </span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-5 max-w-2xl text-base text-muted sm:text-lg">
            BlockIntel compiles your smart contract, then walks it function by
            function — a plain-English summary, an execution-flow explainer,
            and severity-ranked improvements. Connect a wallet and try it on
            your own code.
          </p>
        </Reveal>

        <Reveal delay={300} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/projects">
            <Button variant="primary" size="md" className="group">
              Launch the analyzer
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link
            href="https://github.com/codingWizard-muzammil/BlockIntel"
            target="_blank"
          >
            <Button variant="ghost" size="md">
              View on GitHub
              <ArrowUpRight className="size-4" />
            </Button>
          </Link>
        </Reveal>

        <Reveal delay={400} className="mt-16 w-full max-w-2xl">
          <CodePreview />
        </Reveal>
      </div>
    </section>
  );
}

function CodePreview() {
  const lines = [
    "// SPDX-License-Identifier: MIT",
    "pragma solidity ^0.8.24;",
    "",
    "contract Vault {",
    "    mapping(address => uint256) balances;",
    "",
    "    function withdraw(uint256 amount) external {",
    "        balances[msg.sender] -= amount;",
    "        payable(msg.sender).call{value: amount}(\"\");",
    "    }",
    "}",
  ];

  return (
    <div className="relative">
      <div className="rounded-xl border border-border bg-surface text-left shadow-2xl shadow-black/20">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-danger/60" />
          <span className="size-2.5 rounded-full bg-warning/60" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 text-xs text-muted">Vault.sol</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-xs leading-5 text-muted sm:text-sm">
          {lines.map((line, i) => (
            <div key={i}>
              {line || " "}
              {i === lines.length - 2 && (
                <span className="animate-docs-blink text-accent">▍</span>
              )}
            </div>
          ))}
        </pre>
      </div>

      <div className="absolute -right-6 -bottom-8 w-56 animate-docs-float rounded-lg border border-border bg-surface p-3 text-left shadow-xl sm:-right-14">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Shield className="size-3.5 text-accent" />
          Improvements
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted">Reentrancy risk</span>
          <SeverityBadge severity="high" />
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionHeading
        eyebrow="Workflow"
        title="From paste to verdict in four steps"
      />

      <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="absolute top-6 left-0 hidden h-px w-full bg-border lg:block" />
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 120} className="relative flex flex-col gap-3">
            <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-canvas text-sm font-semibold text-accent">
              {i + 1}
            </div>
            <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
            <p className="text-sm text-muted">{step.description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="border-t border-border bg-surface-muted px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Capabilities"
          title="Everything the analyzer gives you"
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 100}>
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
                <div className="mb-3.75 flex size-9 items-center justify-center rounded-lg bg-accent-soft transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="size-4.5 text-accent" />
                </div>
                <h3 className="mb-1.5 font-semibold text-ink">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportedChains() {
  const chains = Object.keys(CHAIN_LANGUAGES);

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionHeading eyebrow="Coverage" title="Supported chains & languages" />

      <Reveal delay={100}>
        <Card className="mt-14">
          <CardHeading icon={GitBranch}>Contract targets</CardHeading>
          <div className="flex flex-wrap gap-2">
            {chains.map((chain) => (
              <span
                key={chain}
                className="rounded-full border border-border bg-input px-3 py-1 text-xs font-medium capitalize text-ink transition-colors hover:border-accent/50 hover:text-accent"
              >
                {chain}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(new Set(Object.values(CHAIN_LANGUAGES).flat())).map(
              (lang) => (
                <span
                  key={lang}
                  className="rounded-full border border-border-muted bg-transparent px-3 py-1 text-xs font-medium capitalize text-muted"
                >
                  {lang}
                </span>
              ),
            )}
          </div>
        </Card>
      </Reveal>

      <Reveal delay={200}>
        <Card className="mt-5">
          <CardHeading icon={Wallet}>Wallet auth</CardHeading>
          <div className="flex flex-wrap gap-2">
            {["ethereum", "solana"].map((chain) => (
              <span
                key={chain}
                className="rounded-full border border-border bg-input px-3 py-1 text-xs font-medium capitalize text-ink transition-colors hover:border-accent/50 hover:text-accent"
              >
                {chain}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Sign in with an EVM wallet via EIP-6963 discovery, or a Solana
            wallet through the Wallet Standard — no separate accounts to
            manage across chains.
          </p>
        </Card>
      </Reveal>
    </section>
  );
}

function WhatYouGet() {
  const tabs = [
    {
      icon: FileCode2,
      title: "Summary",
      description:
        "Purpose, type, visibility, compiler version, lines of code, and average gas — the shape of the contract at a glance.",
    },
    {
      icon: Cpu,
      title: "Explainer",
      description:
        "A narrative of the contract's execution flow, then every function with its access level and what it does.",
    },
    {
      icon: ListChecks,
      title: "Improvements",
      description:
        "Concrete, severity-tagged suggestions — each with the reasoning behind it and how to fix it.",
    },
  ];

  return (
    <section className="border-t border-border bg-surface-muted px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="Output" title="Three views, one analysis" />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {tabs.map((tab, i) => (
            <Reveal key={tab.title} delay={i * 120}>
              <Card className="h-full">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-accent">
                  <span className="flex size-5 items-center justify-center rounded-full bg-accent-soft text-[10px]">
                    {i + 1}
                  </span>
                  <tab.icon className="size-4" />
                  {tab.title}
                </div>
                <p className="text-sm text-muted">{tab.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <SectionHeading eyebrow="FAQ" title="Good to know" />

      <div className="mt-12 flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={item.question} delay={i * 80}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-ink">
                  {item.question}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-accent" : ""
                  }`}
                />
              </button>
              <div
                className={`grid overflow-hidden px-5 text-sm text-muted transition-all duration-300 ease-out ${
                  isOpen ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
                style={{ display: "grid" }}
              >
                <div className="overflow-hidden">{item.answer}</div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border px-6 py-20">
      <Reveal>
        <div className="relative mx-auto flex max-w-3xl flex-col items-center overflow-hidden rounded-2xl border border-border bg-surface px-8 py-14 text-center">
          <div className="pointer-events-none absolute -top-20 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl animate-docs-blob" />
          <CheckCircle2 className="mb-4 size-8 text-accent" />
          <h2 className="text-2xl font-semibold text-ink">
            Ready to audit your own contract?
          </h2>
          <p className="mt-3 max-w-md text-sm text-muted">
            Connect a wallet, paste your source, and get a full breakdown in
            under a minute.
          </p>
          <Link href="/projects" className="mt-6">
            <Button variant="primary" size="md" className="group">
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal className="flex flex-col items-center text-center">
      <span className="text-xs font-semibold tracking-wide text-accent uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
        {title}
      </h2>
    </Reveal>
  );
}
