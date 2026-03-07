import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  coveredTopics: string[];
  missingTopics: string[];
}

const TopicRecommendations = ({ coveredTopics, missingTopics }: Props) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Covered Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {coveredTopics.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-success-muted">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            Missing / Low Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {missingTopics.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-danger-muted">
              <XCircle className="h-4 w-4 text-danger shrink-0" />
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TopicRecommendations;
