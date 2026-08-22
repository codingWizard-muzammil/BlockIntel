import { useEffect, useRef, useState } from "react";
import { Loader2, LogOut, Settings, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import { useAuthStore } from "@/store/auth-store";
import { truncateAddress } from "@/helpers/address";
import { redirect } from "next/navigation";
interface WalletOptions {
  icon: any;
  label: String;
  fn: () => void;
}
function WalletControl() {
  const { status, address, restore, disconnect } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setMenuOpen(false));

  const walletOptions: WalletOptions[] = [
    {
      icon: Settings,
      label: "Settings",
      fn: () => redirect("/settings", "replace"),
    },
    {
      icon: LogOut,
      label: "Disconnect",
      fn: () => disconnect(),
    },
  ];
  function useClickOutside(
    ref: React.RefObject<HTMLElement | null>,
    onOutside: () => void,
  ) {
    useEffect(() => {
      function handlePointerDown(event: PointerEvent) {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          onOutside();
        }
      }
      document.addEventListener("pointerdown", handlePointerDown);
      return () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    }, [ref, onOutside]);
  }

  useEffect(() => {
    restore();
  }, [restore]);

  if (status === "connected" && address) {
    return (
      <div className="relative" ref={containerRef}>
        <Button variant="secondary" onClick={() => setMenuOpen((o) => !o)}>
          <Wallet className="size-3.5" />
          {truncateAddress(address)}
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-40 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl shadow-black/40">
            {walletOptions.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTimeout(() => {
                    option.fn();
                  }, 100);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-ink transition-colors hover:bg-surface-muted"
              >
                <option.icon className="size-3" />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setModalOpen(true)}
        disabled={status === "connecting"}
        className="disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "connecting" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Wallet className="size-3.5" />
        )}
        {status === "connecting" ? "Connecting..." : "Connect Wallet"}
      </Button>
      <ConnectWalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

export default WalletControl;
