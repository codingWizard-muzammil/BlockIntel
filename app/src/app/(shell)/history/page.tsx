import { History } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function HistoryPage() {
  return (
    <ComingSoon
      icon={History}
      title="Analysis History"
      description="Your past contract analyses will show up here once you've run a scan."
    />
  );
}
