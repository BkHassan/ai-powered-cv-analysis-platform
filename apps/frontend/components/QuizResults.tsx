"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface QuizResultsProps {
  quizId: string;
  simple?: boolean; // For CV card (percentage only)
}

export function QuizResults({ quizId, simple = false }: QuizResultsProps) {
  const [results, setResults] = useState<{
    fileName: string;
    score: number;
    timeTaken: number;
    completedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/${quizId}/results`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.message === "Quiz has not been completed") {
            setError("Quiz has not been completed");
            return;
          }
          throw new Error(errorData.message || "Failed to fetch results");
        }
        const data = await response.json();
        setResults(data);
      } catch (err: any) {
        setError(err.message);
        if (!simple && err.message !== "Quiz has not been completed") {
          toast.error(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [quizId, simple]);

  if (simple) {
    return results && !loading && !error ? (
      <span className="text-sm text-green-600">{results.score}%</span>
    ) : null; // Don't show "Not completed" in CV cards
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p>Loading results...</p>
      ) : error ? (
        <p className="text-gray-500">{error}</p>
      ) : results ? (
        <div>
          <p><strong>Score:</strong> {results.score}%</p>
          <p><strong>Time Taken:</strong> {results.timeTaken} seconds</p>
          <p><strong>Completed At:</strong> {new Date(results.completedAt).toLocaleString()}</p>
        </div>
      ) : (
        <p>No results available</p>
      )}
    </div>
  );
}