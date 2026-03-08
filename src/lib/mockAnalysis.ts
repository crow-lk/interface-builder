// Types matching the FastAPI /analyze endpoint response exactly

// --- Raw API response types ---

export interface ApiBloomPrediction {
  question: string;
  predicted_bloom: string;
  given_marks: number | null;
  recommended_marks: number;
}

export interface ApiCoverageItem {
  type: "topic" | "subtopic";
  text: string;
  parent_topic: string;
  score: number;
  matched_question: string | null;
}

export interface ApiTopicSummary {
  topic: string;
  topic_coverage_score: number;
  subtopic_coverage_score: number;
  status: string; // "Covered" | "Needs attention"
}

export interface ApiCoverage {
  overall_coverage_ratio: number;
  covered_items: ApiCoverageItem[];
  missing_items: ApiCoverageItem[];
  topic_summary: ApiTopicSummary[];
}

export interface ApiResponse {
  model_accuracy: number | null;
  questions_detected: number;
  bloom_predictions: ApiBloomPrediction[];
  coverage: ApiCoverage;
  recommendations: string[];
  report: {
    questions_detected: number;
    bloom_distribution: Record<string, number>;
    overall_coverage_ratio: number;
    given_total_marks: number;
    recommended_total_marks: number;
    missing_items: ApiCoverageItem[];
    topic_summary: ApiTopicSummary[];
    recommendations: string[];
  };
}

// --- Frontend display types (transformed from API) ---

export interface TopicCoverage {
  topic: string;
  learningOutcomes: string;
  coverage: number;
  status: "Complete" | "In Progress";
}

export interface SubtopicProgress {
  name: string;
  progress: number;
}

export interface LearningOutcomeAnalysis {
  label: string;
  value: number;
  color: string;
}

export interface BloomLevel {
  level: string;
  percentage: number;
}

export interface MarksDistribution {
  level: string;
  given: number;
  recommended: number;
}

export interface SubQuestionAnalysis {
  label: string;
  text: string;
  bloomLevel: string;
  givenMarks: number;
  recommendedMarks: number;
}

export interface QuestionAnalysis {
  number: number;
  text: string;
  bloomLevel: string;
  givenMarks: number;
  recommendedMarks: number;
  subQuestions?: SubQuestionAnalysis[];
}

export interface AnalysisResult {
  modelAccuracy: number | null;
  matched: boolean;
  coverageRatio: number;
  topicCoverage: TopicCoverage[];
  subtopicProgress: SubtopicProgress[];
  learningOutcomes: LearningOutcomeAnalysis[];
  bloomLevels: BloomLevel[];
  marksDistribution: MarksDistribution[];
  questions: QuestionAnalysis[];
  coveredTopics: string[];
  missingTopics: string[];
  recommendations: string[];
  totalMarks: number;
  lowerOrderMarks: number;
  lowerOrderPercentage: number;
}

// --- Transform API response to frontend types ---

const BLOOM_ORDER = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
const LOWER_ORDER_LEVELS = new Set(["Remember", "Understand", "Apply"]);

function transformApiResponse(api: ApiResponse): AnalysisResult {
  // Topic coverage table
  const topicCoverage: TopicCoverage[] = api.coverage.topic_summary.map((t) => {
    const covPct = Math.round(t.topic_coverage_score * 100);
    // Count subtopics covered vs total per topic
    const allItems = [...api.coverage.covered_items, ...api.coverage.missing_items];
    const topicSubs = allItems.filter((i) => i.parent_topic === t.topic && i.type === "subtopic");
    const coveredSubs = api.coverage.covered_items.filter(
      (i) => i.parent_topic === t.topic && i.type === "subtopic"
    );
    return {
      topic: t.topic,
      learningOutcomes: `${coveredSubs.length} / ${topicSubs.length || 1}`,
      coverage: Math.min(covPct, 100),
      status: t.status === "Covered" ? "Complete" : "In Progress",
    };
  });

  // Subtopic progress
  const subtopicProgress: SubtopicProgress[] = [];
  const allSubtopics = [
    ...api.coverage.covered_items.filter((i) => i.type === "subtopic"),
    ...api.coverage.missing_items.filter((i) => i.type === "subtopic"),
  ];
  for (const sub of allSubtopics) {
    subtopicProgress.push({
      name: sub.text,
      progress: Math.round(sub.score * 100),
    });
  }

  // Bloom distribution
  const bloomCounts: Record<string, number> = api.report.bloom_distribution;
  const totalQuestions = api.questions_detected || 1;
  const bloomLevels: BloomLevel[] = BLOOM_ORDER.map((level) => ({
    level,
    percentage: Math.round(((bloomCounts[level] || 0) / totalQuestions) * 100),
  }));

  // Learning outcomes analysis
  const coveredCount = api.coverage.covered_items.length;
  const missingCount = api.coverage.missing_items.length;
  const totalItems = coveredCount + missingCount || 1;
  const learningOutcomes: LearningOutcomeAnalysis[] = [
    { label: "Achieved", value: Math.round((coveredCount / totalItems) * 100), color: "hsl(152, 60%, 40%)" },
    { label: "Not Met", value: Math.round((missingCount / totalItems) * 100), color: "hsl(0, 72%, 51%)" },
  ];

  // Marks distribution by Bloom level
  const marksByLevel: Record<string, { given: number; recommended: number }> = {};
  for (const level of BLOOM_ORDER) {
    marksByLevel[level] = { given: 0, recommended: 0 };
  }
  for (const pred of api.bloom_predictions) {
    const level = pred.predicted_bloom;
    if (marksByLevel[level]) {
      marksByLevel[level].given += pred.given_marks || 0;
      marksByLevel[level].recommended += pred.recommended_marks || 0;
    }
  }
  const marksDistribution: MarksDistribution[] = BLOOM_ORDER.map((level) => ({
    level,
    given: marksByLevel[level].given,
    recommended: marksByLevel[level].recommended,
  }));

  // Questions
  const questions: QuestionAnalysis[] = api.bloom_predictions.map((p, i) => ({
    number: i + 1,
    text: p.question,
    bloomLevel: p.predicted_bloom,
    givenMarks: p.given_marks || 0,
    recommendedMarks: p.recommended_marks,
  }));

  // Marks totals
  const totalMarks = api.report.given_total_marks + api.report.recommended_total_marks || 1;
  const lowerOrderMarks = api.bloom_predictions
    .filter((p) => LOWER_ORDER_LEVELS.has(p.predicted_bloom))
    .reduce((sum, p) => sum + (p.given_marks || 0), 0);
  const givenTotal = api.report.given_total_marks || 1;

  return {
    modelAccuracy: api.model_accuracy,
    matched: api.coverage.overall_coverage_ratio >= 0.5,
    coverageRatio: api.coverage.overall_coverage_ratio,
    topicCoverage,
    subtopicProgress: subtopicProgress.slice(0, 10), // limit for UI
    learningOutcomes,
    bloomLevels,
    marksDistribution,
    questions,
    coveredTopics: api.coverage.covered_items.map(
      (i) => `${i.type === "topic" ? "Topic" : "Subtopic"}: ${i.text}`
    ),
    missingTopics: api.coverage.missing_items.map(
      (i) => `${i.type === "topic" ? "Topic" : "Subtopic"}: ${i.text}`
    ),
    recommendations: api.recommendations,
    totalMarks: givenTotal,
    lowerOrderMarks,
    lowerOrderPercentage: Math.round((lowerOrderMarks / givenTotal) * 100),
  };
}

// --- API config ---

const DEFAULT_API_BASE_URL = "http://localhost:8000";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

export async function analyzeDocuments(
  moduleFile: File,
  paperFile: File,
  manualQuestions?: string
): Promise<AnalysisResult> {
  if (!USE_MOCK) {
    const formData = new FormData();
    formData.append("module", moduleFile);
    formData.append("paper", paperFile);
    if (manualQuestions?.trim()) {
      formData.append("manual_questions", manualQuestions.trim());
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let message = "Analysis failed. Please try again.";
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        message = data?.detail || data?.message || message;
      } else {
        const text = await response.text();
        if (text.trim()) message = text.trim();
      }
      throw new Error(message);
    }

    const apiData: ApiResponse = await response.json();
    return transformApiResponse(apiData);
  }

  // Simulated delay + mock results matching API shape
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const mockApiResponse: ApiResponse = {
    model_accuracy: 0.8742,
    questions_detected: 5,
    bloom_predictions: [
      { question: "Discuss compound interest and its applications.", predicted_bloom: "Understand", given_marks: 25, recommended_marks: 10 },
      { question: "Compare capitalism and mercantilism.", predicted_bloom: "Analyze", given_marks: 25, recommended_marks: 10 },
      { question: "Define software traceability.", predicted_bloom: "Remember", given_marks: 10, recommended_marks: 4 },
      { question: "Design a test plan for a banking module.", predicted_bloom: "Create", given_marks: 20, recommended_marks: 14 },
      { question: "Apply the waterfall model to a given scenario.", predicted_bloom: "Apply", given_marks: 20, recommended_marks: 8 },
    ],
    coverage: {
      overall_coverage_ratio: 0.571,
      covered_items: [
        { type: "topic", text: "Software Testing", parent_topic: "Software Testing", score: 0.45, matched_question: "Design a test plan for a banking module." },
        { type: "subtopic", text: "Traceability", parent_topic: "Software Engineering", score: 0.52, matched_question: "Define software traceability." },
        { type: "subtopic", text: "Software Quality", parent_topic: "Software Engineering", score: 0.38, matched_question: "What is compound interest?" },
        { type: "topic", text: "Economics", parent_topic: "Economics", score: 0.41, matched_question: "Compare capitalism and mercantilism." },
      ],
      missing_items: [
        { type: "topic", text: "Design Patterns", parent_topic: "Design Patterns", score: 0.12, matched_question: null },
        { type: "subtopic", text: "Regression Testing", parent_topic: "Software Testing", score: 0.18, matched_question: null },
        { type: "subtopic", text: "Continuous Integration", parent_topic: "Software Engineering", score: 0.08, matched_question: null },
      ],
      topic_summary: [
        { topic: "Software Engineering", topic_coverage_score: 0.45, subtopic_coverage_score: 0.33, status: "Covered" },
        { topic: "Software Testing", topic_coverage_score: 0.45, subtopic_coverage_score: 0.18, status: "Covered" },
        { topic: "Economics", topic_coverage_score: 0.41, subtopic_coverage_score: 0.0, status: "Covered" },
        { topic: "Design Patterns", topic_coverage_score: 0.12, subtopic_coverage_score: 0.0, status: "Needs attention" },
      ],
    },
    recommendations: [
      "Add at least one question for topic: Design Patterns",
    ],
    report: {
      questions_detected: 5,
      bloom_distribution: { Understand: 1, Analyze: 1, Remember: 1, Create: 1, Apply: 1 },
      overall_coverage_ratio: 0.571,
      given_total_marks: 100,
      recommended_total_marks: 42,
      missing_items: [],
      topic_summary: [],
      recommendations: [],
    },
  };

  return transformApiResponse(mockApiResponse);
}
