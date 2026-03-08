import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuestionAnalysis } from "@/lib/mockAnalysis";

const BLOOM_COLORS: Record<string, string> = {
  Remember: "bg-muted text-muted-foreground",
  Understand: "bg-bloom-muted text-bloom",
  Apply: "bg-bloom-muted text-bloom",
  Analyze: "bg-success-muted text-success",
  Evaluate: "bg-success-muted text-success",
  Create: "bg-success-muted text-success",
};

interface Props {
  data: QuestionAnalysis[];
}

const QuestionRow = ({ q }: { q: QuestionAnalysis }) => {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = q.subQuestions && q.subQuestions.length > 0;

  return (
    <>
      <tr
        className={`border-b last:border-0 ${hasSubs ? "cursor-pointer hover:bg-muted/50" : ""}`}
        onClick={() => hasSubs && setExpanded(!expanded)}
      >
        <td className="px-6 py-3 font-medium text-foreground">
          <div className="flex items-center gap-1.5">
            {hasSubs && (
              expanded
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            Q{q.number}
          </div>
        </td>
        <td className="px-4 py-3 text-foreground max-w-xs truncate font-medium">{q.text}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BLOOM_COLORS[q.bloomLevel] || "bg-muted text-muted-foreground"}`}>
            {q.bloomLevel}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono text-foreground font-semibold">{q.givenMarks}</td>
        <td className="px-6 py-3 text-right font-mono text-foreground font-semibold">{q.recommendedMarks}</td>
      </tr>
      {expanded && q.subQuestions?.map((sub) => (
        <tr key={sub.label} className="border-b last:border-0 bg-muted/30">
          <td className="px-6 py-2 pl-12 text-muted-foreground text-xs">{q.number}{sub.label}</td>
          <td className="px-4 py-2 text-muted-foreground text-xs max-w-xs truncate">{sub.text}</td>
          <td className="px-4 py-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BLOOM_COLORS[sub.bloomLevel] || "bg-muted text-muted-foreground"}`}>
              {sub.bloomLevel}
            </span>
          </td>
          <td className="px-4 py-2 text-right font-mono text-muted-foreground text-xs">{sub.givenMarks}</td>
          <td className="px-6 py-2 text-right font-mono text-muted-foreground text-xs">{sub.recommendedMarks}</td>
        </tr>
      ))}
    </>
  );
};

const QuestionTable = ({ data }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Question Analysis</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left font-medium px-6 py-3">Q#</th>
                <th className="text-left font-medium px-4 py-3">Question</th>
                <th className="text-left font-medium px-4 py-3">Bloom's Level</th>
                <th className="text-right font-medium px-4 py-3">Given Marks</th>
                <th className="text-right font-medium px-6 py-3">Recommended</th>
              </tr>
            </thead>
            <tbody>
              {data.map((q) => (
                <QuestionRow key={q.number} q={q} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionTable;
