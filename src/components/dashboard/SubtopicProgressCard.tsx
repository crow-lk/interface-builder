import { MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SubtopicProgress } from "@/lib/mockAnalysis";

interface Props {
  data: SubtopicProgress[];
}

const SubtopicProgressCard = ({ data }: Props) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Subtopic Progress</CardTitle>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm text-foreground w-36 shrink-0">{item.name}</span>
            <Progress value={item.progress} className="h-2.5 flex-1" />
            <span className="text-sm font-semibold text-foreground w-10 text-right">{item.progress}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SubtopicProgressCard;
