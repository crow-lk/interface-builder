import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuestionAnalysis } from "@/lib/mockAnalysis";

const BLOOM_COLORS: Record<string, string> = {
  Remember: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Understand: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Apply: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Analyze: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Evaluate: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  Create: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

interface Props {
  data: QuestionAnalysis[];
}

const QuestionRow = ({ q }: { q: QuestionAnalysis }) => {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = q.subQuestions && q.subQuestions.length > 0;
  const marksDiff = q.recommendedMarks - q.givenMarks;

  return (
    <>
      <tr
        className={`border-b border-border/50 transition-colors ${hasSubs ? "cursor-pointer hover:bg-accent/50" : "hover:bg-muted/30"}`}
        onClick={() => hasSubs && setExpanded(!expanded)}
      >
        <td className="px-5 py-3.5 font-semibold text-foreground whitespace-nowrap">
          <div className="flex items-center gap-2">
            {hasSubs && (
              <span className="text-muted-foreground">
                {expanded
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />
                }
              </span>
            )}
            <span>Q{q.number}</span>
            {hasSubs && (
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {q.subQuestions!.length} parts
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5 text-foreground max-w-sm">
          <span className="line-clamp-2 text-sm">{q.text}</span>
        </td>
        <td className="px-4 py-3.5">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${BLOOM_COLORS[q.bloomLevel] || "bg-muted text-muted-foreground"}`}>
            {q.bloomLevel}
          </span>
        </td>
        <td className="px-4 py-3.5 text-right font-mono text-foreground font-semibold tabular-nums">
          {q.givenMarks}
        </td>
        <td className="px-5 py-3.5 text-right font-mono tabular-nums">
          <span className={`font-semibold ${marksDiff > 0 ? "text-emerald-600 dark:text-emerald-400" : marksDiff < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
            {q.recommendedMarks}
          </span>
          {marksDiff !== 0 && (
            <span className={`ml-1.5 text-[10px] ${marksDiff > 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {marksDiff > 0 ? `+${marksDiff}` : marksDiff}
            </span>
          )}
        </td>
      </tr>
      {expanded && q.subQuestions?.map((sub) => (
        <tr key={sub.label} className="border-b border-border/30 bg-muted/20">
          <td className="px-5 py-2.5 pl-14 text-muted-foreground text-xs font-medium">
            {q.number}{sub.label}
          </td>
          <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-sm">
            <span className="line-clamp-1">{sub.text}</span>
          </td>
          <td className="px-4 py-2.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BLOOM_COLORS[sub.bloomLevel] || "bg-muted text-muted-foreground"}`}>
              {sub.bloomLevel}
            </span>
          </td>
          <td className="px-4 py-2.5 text-right font-mono text-muted-foreground text-xs tabular-nums">
            {sub.givenMarks}
          </td>
          <td className="px-5 py-2.5 text-right font-mono text-muted-foreground text-xs tabular-nums">
            {sub.recommendedMarks}
          </td>
        </tr>
      ))}
    </>
  );
};

const QuestionTable = ({ data }: Props) => {
  const totalGiven = data.reduce((s, q) => s + q.givenMarks, 0);
  const totalRecommended = data.reduce((s, q) => s + q.recommendedMarks, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Question Analysis</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Given: <span className="font-mono font-semibold text-foreground">{totalGiven}</span></span>
            <span>Recommended: <span className="font-mono font-semibold text-foreground">{totalRecommended}</span></span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="text-left font-medium px-5 py-3 text-xs uppercase tracking-wider">Q#</th>
                <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider">Question</th>
                <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider">Bloom's Level</th>
                <th className="text-right font-medium px-4 py-3 text-xs uppercase tracking-wider">Given</th>
                <th className="text-right font-medium px-5 py-3 text-xs uppercase tracking-wider">Recommended</th>
              </tr>
            </thead>
            <tbody>
              {data.map((q) => (
                <QuestionRow key={q.number} q={q} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td className="px-5 py-3 font-semibold text-foreground text-xs uppercase" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-foreground tabular-nums">
                  {totalGiven}
                </td>
                <td className="px-5 py-3 text-right font-mono font-bold text-foreground tabular-nums">
                  {totalRecommended}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionTable;
