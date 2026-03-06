import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BloomQuestionProps {
  questionNumber: number;
  questionText: string;
  bloomLevel: string;
}

const BLOOM_COLORS: Record<string, string> = {
  Remember: "bg-muted text-muted-foreground",
  Understand: "bg-bloom-muted text-bloom",
  Apply: "bg-bloom-muted text-bloom",
  Analyze: "bg-success-muted text-success",
  Evaluate: "bg-success-muted text-success",
  Create: "bg-success-muted text-success",
};

const BloomQuestionCard = ({ questionNumber, questionText, bloomLevel }: BloomQuestionProps) => {
  const [expanded, setExpanded] = useState(false);
  const colorClass = BLOOM_COLORS[bloomLevel] || "bg-bloom-muted text-bloom";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-4 w-4 text-bloom shrink-0" />
            <span className="font-sans font-medium text-foreground">Question {questionNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
              {bloomLevel}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {expanded && (
          <p className="mt-3 text-sm text-muted-foreground border-t pt-3 italic">
            "{questionText}"
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BloomQuestionCard;
