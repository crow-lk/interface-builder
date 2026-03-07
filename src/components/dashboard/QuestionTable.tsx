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
                <th className="text-right font-medium px-6 py-3">AI Recommended</th>
              </tr>
            </thead>
            <tbody>
              {data.map((q) => (
                <tr key={q.number} className="border-b last:border-0">
                  <td className="px-6 py-3 font-medium text-foreground">{q.number}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{q.text}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BLOOM_COLORS[q.bloomLevel] || "bg-muted text-muted-foreground"}`}>
                      {q.bloomLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{q.givenMarks}</td>
                  <td className="px-6 py-3 text-right font-mono text-foreground">{q.recommendedMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionTable;
