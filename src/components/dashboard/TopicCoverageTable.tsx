import { MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TopicCoverage } from "@/lib/mockAnalysis";

interface Props {
  data: TopicCoverage[];
}

const TopicCoverageTable = ({ data }: Props) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Topic Coverage</CardTitle>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left font-medium px-6 py-3">Topic</th>
                <th className="text-left font-medium px-6 py-3">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-6 py-3 font-medium text-foreground">{row.topic}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={row.coverage}
                        className="h-2 w-24"
                      />
                      <span className="text-xs font-semibold text-foreground">{row.coverage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopicCoverageTable;
