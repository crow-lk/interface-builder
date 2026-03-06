import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MatchResultProps {
  matched: boolean;
  coverageRatio: number;
}

const MatchResultCard = ({ matched, coverageRatio }: MatchResultProps) => {
  return (
    <Card className={`border-2 ${matched ? "border-success bg-success-muted" : "border-danger bg-danger-muted"}`}>
      <CardContent className="p-6 flex items-center gap-4">
        {matched ? (
          <CheckCircle2 className="h-10 w-10 text-success shrink-0" />
        ) : (
          <XCircle className="h-10 w-10 text-danger shrink-0" />
        )}
        <div>
          <p className={`text-lg font-semibold ${matched ? "text-success" : "text-danger"}`}>
            Matched: {matched ? "YES" : "NO"}
          </p>
          <p className="text-sm text-muted-foreground">
            Coverage Ratio: <span className="font-mono font-semibold">{coverageRatio.toFixed(2)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchResultCard;
