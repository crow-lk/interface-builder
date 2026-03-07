import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { BloomLevel } from "@/lib/mockAnalysis";

const BLOOM_COLORS = [
  "hsl(45, 90%, 55%)",   // Remember - yellow
  "hsl(217, 71%, 45%)",  // Understand - blue
  "hsl(152, 60%, 40%)",  // Apply - green
  "hsl(25, 85%, 55%)",   // Analyze - orange
  "hsl(280, 60%, 50%)",  // Evaluate - purple
  "hsl(0, 72%, 51%)",    // Create - red
];

interface Props {
  data: BloomLevel[];
}

const CognitiveLevelChart = ({ data }: Props) => {
  const chartData = data.map((d, i) => ({ ...d, color: BLOOM_COLORS[i] }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Cognitive Level Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="percentage"
                nameKey="level"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                strokeWidth={2}
                stroke="hsl(var(--card))"
                label={({ percentage }) => `${percentage}%`}
                labelLine
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => `${val}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {chartData.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-foreground">{item.level}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CognitiveLevelChart;
