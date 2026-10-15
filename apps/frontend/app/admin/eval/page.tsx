"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

type CaseResult = {
  id: string;
  question: string;
  passed: boolean;
  retrievalHitRate: number;
  answerHitRate: number;
  faithfulness: number;
  totalLatencyMs: number;
  retrievedPreview: string;
  answerPreview: string;
  error?: string;
  judge?: { grounded: boolean; relevant: boolean; score: number };
};

type EvalSummary = {
  ranAt: string;
  datasetVersion: string;
  caseCount: number;
  passRate: number;
  retrievalHitRate: number;
  answerHitRate: number;
  faithfulness: number;
  errorRate: number;
  latencyMs: { avg: number; p50: number; p95: number };
  cases: CaseResult[];
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function EvalPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [includeJudge, setIncludeJudge] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EvalSummary | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== "admin") {
        router.replace("/admin");
        return;
      }
    } catch {
      router.replace("/");
      return;
    }
    setIsCheckingAuth(false);
  }, [router]);

  const runEval = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/eval/rag`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ includeJudge }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Evaluation failed (${response.status})`);
      }
      setSummary(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setRunning(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-4">
        <div className="flex items-center text-sm text-gray-700 mb-8">
          <Home className="w-5 h-5 mr-2" />
          <Link
            href="/admin"
            className="flex items-center hover:text-purple-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="font-semibold">Quality evaluation</span>
          </Link>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              RAG quality evaluation
            </h1>
            <p className="text-gray-600 mb-4">
              Runs a fixed gold CV through the same embedding, Chroma retrieval,
              and Gemini chat path as production. Scores retrieval relevance,
              answer relevance, faithfulness, errors, and latency. Production CVs
              are not modified.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
              <input
                type="checkbox"
                checked={includeJudge}
                onChange={(event) => setIncludeJudge(event.target.checked)}
              />
              Also run Gemini as a judge (extra cost, slower)
            </label>
            <Button onClick={runEval} disabled={running}>
              {running ? "Running evaluation…" : "Run evaluation"}
            </Button>
            {running && (
              <p className="mt-4 text-sm text-gray-600">
                Waiting on Gemini. If the free-tier quota of 20 requests is
                already used, this returns an error instead of retrying.
              </p>
            )}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </section>

          {summary && (
            <>
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreCard label="Pass rate" value={percent(summary.passRate)} />
                <ScoreCard
                  label="Retrieval hit rate"
                  value={percent(summary.retrievalHitRate)}
                />
                <ScoreCard
                  label="Answer hit rate"
                  value={percent(summary.answerHitRate)}
                />
                <ScoreCard
                  label="Faithfulness"
                  value={percent(summary.faithfulness)}
                />
              </section>
              <section className="rounded-xl bg-white p-6 shadow-sm text-sm text-gray-700">
                <p>
                  Latency avg {summary.latencyMs.avg} ms · p50{" "}
                  {summary.latencyMs.p50} ms · p95 {summary.latencyMs.p95} ms
                </p>
                <p>
                  Error rate {percent(summary.errorRate)} · {summary.caseCount}{" "}
                  cases · dataset v{summary.datasetVersion}
                </p>
              </section>
              <section className="space-y-4">
                {summary.cases.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h2 className="font-semibold text-gray-900">{item.id}</h2>
                      <span
                        className={
                          item.passed
                            ? "text-green-700 font-semibold"
                            : "text-red-700 font-semibold"
                        }
                      >
                        {item.passed ? "Pass" : "Fail"}
                      </span>
                    </div>
                    <p className="text-gray-800 mb-2">{item.question}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      retrieval {percent(item.retrievalHitRate)} · answer{" "}
                      {percent(item.answerHitRate)} · faithfulness{" "}
                      {percent(item.faithfulness)} · {item.totalLatencyMs} ms
                    </p>
                    {item.judge && (
                      <p className="text-sm text-gray-600 mb-2">
                        Judge: grounded {String(item.judge.grounded)}, relevant{" "}
                        {String(item.judge.relevant)}, score {item.judge.score}
                        /5
                      </p>
                    )}
                    {item.error && (
                      <p className="text-sm text-red-600">{item.error}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Retrieved: {item.retrievedPreview || "—"}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Answer: {item.answerPreview || "—"}
                    </p>
                  </article>
                ))}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-purple-700">{value}</p>
    </div>
  );
}
