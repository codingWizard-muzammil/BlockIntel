import type { ComponentType, SVGProps } from "react";
import { SiEthereum, SiPolygon, SiBnbchain, SiOptimism } from "react-icons/si";
import type { IconType } from "react-icons";

function ArbitrumIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M9 15 12 7l3 8"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AvalancheIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 3 21 20H3L12 3Zm0 10-3.5 7h7L12 13Z"
      />
    </svg>
  );
}

export const CHAIN_ICONS: Record<string, IconType | ComponentType<SVGProps<SVGSVGElement>>> = {
  ethereum: SiEthereum,
  polygon: SiPolygon,
  "bnb chain": SiBnbchain,
  arbitrum: ArbitrumIcon,
  optimism: SiOptimism,
  avalanche: AvalancheIcon,
};

export function ChainIcon({
  chain,
  className,
}: {
  chain: string;
  className?: string;
}) {
  const Icon = CHAIN_ICONS[chain];
  if (!Icon) return null;
  return <Icon className={className} />;
}
