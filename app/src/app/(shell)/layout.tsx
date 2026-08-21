import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
