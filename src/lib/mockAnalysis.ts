// Simulated analysis results — replace with real API call to your Python backend
// Your Python backend should load the .h5 model and expose a POST /analyze endpoint

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

export const API_BASE_URL = ""; // Set your Python backend URL here, e.g. "https://your-api.onrender.com"

export async function analyzeDocuments(
  moduleFile: File,
  paperFile: File
): Promise<AnalysisResult> {
  // If API_BASE_URL is set, call the real backend
  if (API_BASE_URL) {
    const formData = new FormData();
    formData.append("module", moduleFile);
    formData.append("paper", paperFile);

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Analysis failed. Please try again.");
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
