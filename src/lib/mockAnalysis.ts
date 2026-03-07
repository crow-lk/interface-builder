// Analysis helper — calls the Python backend that loads the .h5 model

export interface TopicCoverage {
  topic: string;
  learningOutcomes: string; // e.g. "4/5"
  coverage: number; // percentage
  status: "Complete" | "In Progress";
}

export interface SubtopicProgress {
  name: string;
  progress: number; // percentage
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

export interface QuestionAnalysis {
  number: number;
  text: string;
  bloomLevel: string;
  givenMarks: number;
  recommendedMarks: number;
}

export interface AnalysisResult {
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
  totalMarks: number;
  lowerOrderMarks: number;
  lowerOrderPercentage: number;
}

const DEFAULT_API_BASE_URL = "http://localhost:8000";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export async function analyzeDocuments(
  moduleFile: File,
  paperFile: File
): Promise<AnalysisResult> {
  if (!USE_MOCK) {
    const formData = new FormData();
    formData.append("module", moduleFile);
    formData.append("paper", paperFile);

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

    return response.json();
  }

  // Simulated delay + mock results for demo
  await new Promise((resolve) => setTimeout(resolve, 2500));

  return {
    matched: true,
    coverageRatio: 0.78,
    topicCoverage: [
      { topic: "Biological Bases", learningOutcomes: "4 / 5", coverage: 90, status: "Complete" },
      { topic: "Cognitive Processes", learningOutcomes: "3 / 5", coverage: 75, status: "In Progress" },
      { topic: "Developmental Psychology", learningOutcomes: "5 / 5", coverage: 100, status: "Complete" },
      { topic: "Social Psychology", learningOutcomes: "4 / 5", coverage: 60, status: "In Progress" },
      { topic: "Abnormal Psychology", learningOutcomes: "3 / 4", coverage: 80, status: "Complete" },
    ],
    subtopicProgress: [
      { name: "Neurotransmitters", progress: 80 },
      { name: "Brain Structures", progress: 65 },
      { name: "Memory Theories", progress: 92 },
      { name: "Social Influence", progress: 55 },
    ],
    learningOutcomes: [
      { label: "Achieved", value: 50, color: "hsl(152, 60%, 40%)" },
      { label: "In Progress", value: 30, color: "hsl(38, 92%, 50%)" },
      { label: "Not Met", value: 15, color: "hsl(0, 72%, 51%)" },
      { label: "Partially Met", value: 5, color: "hsl(217, 71%, 45%)" },
    ],
    bloomLevels: [
      { level: "Remember", percentage: 11 },
      { level: "Understand", percentage: 21 },
      { level: "Apply", percentage: 15 },
      { level: "Analyze", percentage: 20 },
      { level: "Evaluate", percentage: 24 },
      { level: "Create", percentage: 15 },
    ],
    marksDistribution: [
      { level: "Remember", given: 10, recommended: 0 },
      { level: "Understand", given: 20, recommended: 13 },
      { level: "Apply", given: 40, recommended: 38 },
      { level: "Analyze", given: 50, recommended: 52 },
      { level: "Evaluate", given: 80, recommended: 45 },
      { level: "Create", given: 55, recommended: 30 },
    ],
    questions: [
      { number: 1, text: "What is compound interest?", bloomLevel: "Understand", givenMarks: 10, recommendedMarks: 8 },
      { number: 2, text: "Compare capitalism and mercantilism.", bloomLevel: "Analyze", givenMarks: 20, recommendedMarks: 25 },
      { number: 3, text: "Define software traceability.", bloomLevel: "Remember", givenMarks: 5, recommendedMarks: 5 },
      { number: 4, text: "Design a test plan for a banking module.", bloomLevel: "Create", givenMarks: 30, recommendedMarks: 35 },
      { number: 5, text: "Apply the waterfall model to a given scenario.", bloomLevel: "Apply", givenMarks: 15, recommendedMarks: 15 },
    ],
    coveredTopics: [
      "Topic: Traceability",
      "CLO2: Explain software quality concepts",
      "Topic: Software testing",
      "CLO1: Define key software engineering terms",
    ],
    missingTopics: [
      "CLO4: Evaluate design patterns",
      "Topic: Regression testing",
      "Topic: Continuous integration",
    ],
    totalMarks: 240,
    lowerOrderMarks: 152,
    lowerOrderPercentage: 63,
  };
}
