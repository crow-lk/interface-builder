import { useState } from "react";
import { Loader2, Info, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FileUploadCard from "@/components/FileUploadCard";
import MatchResultCard from "@/components/MatchResultCard";
import BloomQuestionCard from "@/components/BloomQuestionCard";
import TopicList from "@/components/TopicList";
import { analyzeDocuments, type AnalysisResult } from "@/lib/mockAnalysis";

const Index = () => {
  const [moduleFile, setModuleFile] = useState<File | null>(null);
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!moduleFile || !paperFile) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await analyzeDocuments(moduleFile, paperFile);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-3xl py-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              Exam Paper vs Module Matching System
            </h1>
          </div>
          <p className="text-muted-foreground font-sans">
            Upload a module outline and an exam paper to check Bloom's taxonomy coverage and module alignment.
          </p>
        </div>
      </header>

      <main className="container max-w-3xl py-8 space-y-6">
        {/* Upload Section */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FileUploadCard
            label="Upload Module"
            description="Upload the module outline containing topics or CLOs."
            file={moduleFile}
            onFileChange={setModuleFile}
          />
          <FileUploadCard
            label="Upload Exam Paper"
            description="Upload the exam paper containing questions."
            file={paperFile}
            onFileChange={setPaperFile}
          />
        </div>

        {/* Action Button */}
        <Button
          size="lg"
          className="w-full font-sans font-semibold text-base"
          disabled={!moduleFile || !paperFile || loading}
          onClick={handleAnalyze}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing documents...
            </>
          ) : (
            "Check Match"
          )}
        </Button>

        {/* Error */}
        {error && (
          <Card className="border-danger bg-danger-muted">
            <CardContent className="p-4 text-sm text-danger font-medium">{error}</CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="border-t pt-6">
              <h2 className="font-serif font-bold text-xl text-foreground mb-4">Results</h2>

              {/* Match Result */}
              <MatchResultCard matched={results.matched} coverageRatio={results.coverageRatio} />
            </div>

            {/* Bloom Levels */}
            <div>
              <h3 className="font-sans font-semibold text-foreground mb-3">Predicted Bloom Levels</h3>
              <div className="space-y-2">
                {results.questions.map((q) => (
                  <BloomQuestionCard
                    key={q.number}
                    questionNumber={q.number}
                    questionText={q.text}
                    bloomLevel={q.bloomLevel}
                  />
                ))}
              </div>
            </div>

            {/* Topics */}
            <div className="grid gap-6 sm:grid-cols-2">
              <TopicList title="Covered Module Items" items={results.coveredTopics} type="covered" />
              <TopicList title="Missing / Not Included" items={results.missingTopics} type="missing" />
            </div>
          </div>
        )}

        {/* Info Panel */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Supported formats:</strong> PDF, DOCX, TXT, PNG, JPG</p>
              <p>Scanned documents are supported using OCR.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
