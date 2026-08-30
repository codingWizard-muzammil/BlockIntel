"use client";

import { FlaskConical } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export function PlaygroundView() {
  return (
    <ComingSoon
      icon={FlaskConical}
      title="Playground"
      description="Simulate transactions against this contract and inspect the results here."
    />
  );
}
