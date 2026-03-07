// Analysis helper — calls the Python backend that loads the .h5 model

export interface AnalysisResult {
  matched: boolean;
  coverageRatio: number;
  questions: {
    number: number;
    text: string;
    bloomLevel: string;
  }[];
  coveredTopics: string[];
  missingTopics: string[];
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
    questions: [
      { number: 1, text: "What is compound interest?", bloomLevel: "Understand" },
      { number: 2, text: "Compare capitalism and mercantilism.", bloomLevel: "Analyze" },
      { number: 3, text: "Define software traceability.", bloomLevel: "Remember" },
      { number: 4, text: "Design a test plan for a banking module.", bloomLevel: "Create" },
      { number: 5, text: "Apply the waterfall model to a given scenario.", bloomLevel: "Apply" },
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
  };
}
