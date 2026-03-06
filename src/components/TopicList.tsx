import { CheckCircle2, XCircle } from "lucide-react";

interface TopicListProps {
  title: string;
  items: string[];
  type: "covered" | "missing";
}

const TopicList = ({ title, items, type }: TopicListProps) => {
  const isCovered = type === "covered";

  return (
    <div>
      <h3 className="font-sans font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
              isCovered ? "bg-success-muted" : "bg-danger-muted"
            }`}
          >
            {isCovered ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-danger shrink-0" />
            )}
            <span className="text-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicList;
