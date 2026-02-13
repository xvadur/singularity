import { MorningBrief } from "../../components/home/MorningBrief";
import { StatsGrid } from "../../components/home/StatsGrid";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <MorningBrief />
      <StatsGrid />
    </div>
  );
}
