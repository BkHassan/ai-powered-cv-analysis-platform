export type GoldDocument = {
  cvId: string;
  label: string;
  text: string;
};

export type GoldCase = {
  id: string;
  cvId: string;
  question: string;
  goldAnswer: string;
  relevantKeywords: string[];
  answerKeywords: string[];
  forbiddenPhrases: string[];
  answerMatch?: 'all' | 'any';
  expectAbstain?: boolean;
};

export type GoldDataset = {
  version: string;
  description: string;
  nResults: number;
  documents: GoldDocument[];
  cases: GoldCase[];
};

export type CaseEvalResult = {
  id: string;
  cvId: string;
  question: string;
  goldAnswer: string;
  passed: boolean;
  retrievalHitRate: number;
  answerHitRate: number;
  faithfulness: number;
  abstention: number | null;
  retrievalLatencyMs: number;
  generationLatencyMs: number;
  totalLatencyMs: number;
  retrievedPreview: string;
  answerPreview: string;
  error?: string;
  judge?: {
    grounded: boolean;
    relevant: boolean;
    score: number;
  };
};

export type EvalSummary = {
  ranAt: string;
  datasetVersion: string;
  caseCount: number;
  passRate: number;
  retrievalHitRate: number;
  answerHitRate: number;
  faithfulness: number;
  abstention: number | null;
  errorRate: number;
  latencyMs: {
    avg: number;
    p50: number;
    p95: number;
  };
  cases: CaseEvalResult[];
};
