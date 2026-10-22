import { browserDemoEnabled } from "@/modules/runtime/mode";
import { ExamOverview } from "@/components/exam-overview";
export default function ExamPage() {
  return <ExamOverview browserOnly={browserDemoEnabled()} />;
}
