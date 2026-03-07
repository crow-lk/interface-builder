import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList
} from "recharts";
import type { MarksDistribution } from "@/lib/mockAnalysis";

interface Props {
  data: MarksDistribution[];
  totalMarks: number;
  lowerOrderMarks: number;
  lowerOrderPercentage: number;
}

const MarksDistributionChart = ({ data, totalMarks, lowerOrderMarks, lowerOrderPercentage }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Marks Distribution by Cognitive Level</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="level" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} MK`} />
              <Tooltip />
              <ReferenceLine
                y={30}
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                label={{ value: "Institutional Guideline", position: "right", fontSize: 10, fill: "hsl(var(--success))" }}
              />
              <Bar dataKey="given" name="Given Marks" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--primary))" />
                ))}
                <LabelList dataKey="given" position="top" fontSize={10} />
              </Bar>
              <Bar dataKey="recommended" name="AI Recommended" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--bloom))" opacity={0.5} />
                ))}
                <LabelList dataKey="recommended" position="top" fontSize={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {lowerOrderMarks} out of {totalMarks} total marks ({lowerOrderPercentage}%) are allocated to lower-order levels. Consider adjusting to meet guidelines.
        </p>
      </CardContent>
    </Card>
  );
};

export default MarksDistributionChart;
