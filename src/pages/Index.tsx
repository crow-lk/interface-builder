import { useState } from "react";
import { Loader2, Upload, BookOpen, FileText, BarChart3, Brain, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploadCard from "@/components/FileUploadCard";
import TopicCoverageTable from "@/components/dashboard/TopicCoverageTable";
import SubtopicProgressCard from "@/components/dashboard/SubtopicProgressCard";
import LearningOutcomesChart from "@/components/dashboard/LearningOutcomesChart";
import CognitiveLevelChart from "@/components/dashboard/CognitiveLevelChart";
import MarksDistributionChart from "@/components/dashboard/MarksDistributionChart";
import QuestionTable from "@/components/dashboard/QuestionTable";
import TopicRecommendations from "@/components/dashboard/TopicRecommendations";
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
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-7xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground">
              Exam Moderation System
            </h1>
          </div>
          {results && (
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-7xl py-6 space-y-6">
        {/* Upload Section */}
        {!results && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                Upload & Analyze
              </h2>
              <p className="text-muted-foreground">
                Upload a module outline and an exam paper to analyze topic coverage, Bloom's taxonomy, and marks distribution.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FileUploadCard
                label="Module Outline"
                description="Upload the module outline containing topics or CLOs."
                file={moduleFile}
                onFileChange={setModuleFile}
              />
              <FileUploadCard
                label="Exam Paper"
                description="Upload the exam paper containing questions."
                file={paperFile}
                onFileChange={setPaperFile}
              />
            </div>

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
                <>
                  <Upload className="h-4 w-4" />
                  Analyze Exam Paper
                </>
              )}
            </Button>

            {error && (
              <Card className="border-danger bg-danger-muted">
                <CardContent className="p-4 text-sm text-danger font-medium">{error}</CardContent>
              </Card>
            )}

            <Card className="bg-muted/50">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                <p><strong>Supported formats:</strong> PDF, DOCX, TXT, PNG, JPG</p>
                <p>Scanned documents are supported using OCR.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Dashboard */}
        {results && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Back to upload */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setResults(null); setModuleFile(null); setPaperFile(null); }}
              className="text-muted-foreground"
            >
              ← New Analysis
            </Button>

            <Tabs defaultValue="coverage" className="w-full">
              <TabsList className="grid w-full grid-cols-4 max-w-lg">
                <TabsTrigger value="coverage" className="gap-1.5 text-xs sm:text-sm">
                  <Target className="h-3.5 w-3.5" />
                  Coverage
                </TabsTrigger>
                <TabsTrigger value="blooms" className="gap-1.5 text-xs sm:text-sm">
                  <Brain className="h-3.5 w-3.5" />
                  Bloom's
                </TabsTrigger>
                <TabsTrigger value="marks" className="gap-1.5 text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Marks
                </TabsTrigger>
                <TabsTrigger value="questions" className="gap-1.5 text-xs sm:text-sm">
                  <FileText className="h-3.5 w-3.5" />
                  Questions
                </TabsTrigger>
              </TabsList>

              {/* Tab: Topic Coverage */}
              <TabsContent value="coverage" className="space-y-6 mt-6">
                <TopicCoverageTable data={results.topicCoverage} />
                <div className="grid gap-4 md:grid-cols-2">
                  <SubtopicProgressCard data={results.subtopicProgress} />
                  <LearningOutcomesChart data={results.learningOutcomes} />
                </div>
                <TopicRecommendations
                  coveredTopics={results.coveredTopics}
                  missingTopics={results.missingTopics}
                />
              </TabsContent>

              {/* Tab: Bloom's Taxonomy */}
              <TabsContent value="blooms" className="space-y-6 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <CognitiveLevelChart data={results.bloomLevels} />
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-foreground mb-4">Bloom's Level Distribution</h3>
                      <div className="space-y-3">
                        {results.bloomLevels.map((b, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-foreground">{b.level}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${b.percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-semibold text-foreground w-8 text-right">
                                {b.percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab: Marks */}
              <TabsContent value="marks" className="space-y-6 mt-6">
                <MarksDistributionChart
                  data={results.marksDistribution}
                  totalMarks={results.totalMarks}
                  lowerOrderMarks={results.lowerOrderMarks}
                  lowerOrderPercentage={results.lowerOrderPercentage}
                />
              </TabsContent>

              {/* Tab: Questions */}
              <TabsContent value="questions" className="space-y-6 mt-6">
                <QuestionTable data={results.questions} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
