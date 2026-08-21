import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description="Preferences for chains, compilers, and AI model choice will live here."
    />
  );
}
