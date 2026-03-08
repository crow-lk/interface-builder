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
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.filter(d => d.percentage > 0)}
                dataKey="percentage"
                nameKey="level"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={85}
                strokeWidth={2}
                stroke="hsl(var(--card))"
                label={({ cx, cy, midAngle, outerRadius, percentage }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 20;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                      {percentage}%
                    </text>
                  );
                }}
                labelLine={false}
              >
                {chartData.filter(d => d.percentage > 0).map((entry, i) => (
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
