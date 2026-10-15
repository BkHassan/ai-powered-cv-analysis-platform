export type GoldCase = {
  id: string;
  question: string;
  relevantKeywords: string[];
  answerKeywords: string[];
  forbiddenPhrases: string[];
  answerMatch?: 'all' | 'any';
};

export type GoldDataset = {
  version: string;
  description: string;
  nResults: number;
  document: string;
  cases: GoldCase[];
};

export type CaseEvalResult = {
  id: string;
  question: string;
  passed: boolean;
  retrievalHitRate: number;
  answerHitRate: number;
  faithfulness: number;
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
  errorRate: number;
  latencyMs: {
    avg: number;
    p50: number;
    p95: number;
  };
  cases: CaseEvalResult[];
};
