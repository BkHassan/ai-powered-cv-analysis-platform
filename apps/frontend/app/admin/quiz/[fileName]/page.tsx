"use client";

import { useState, useEffect, use } from "react";
import { GenerateQuiz } from "@/components/generate-quiz";
import { Card } from "@/components/ui/card";
import { toast } from "react-toastify";

export default function QuizGenerationPage({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = use(params);
  const [attempts, setAttempts] = useState<
    { attemptNumber: number; score?: number; completedAt?: string; timeTaken?: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please log in to view quizzes");
          return;
        }

        const attemptsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/cv/${encodeURIComponent(fileName)}/attempts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!attemptsResponse.ok) {
          const errorData = await attemptsResponse.json();
          throw new Error(errorData.message || "Failed to fetch quiz attempts");
        }
        const attemptsData = await attemptsResponse.json();
        setAttempts(attemptsData.slice(-3)); // Show only the last 3 attempts
      } catch (err: any) {
        toast.error(err.message || "Failed to load quiz data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fileName]);

  const formatTime = (seconds: number | undefined) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateStr));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <GenerateQuiz fileName={fileName} cvId={fileName} />
        {loading ? (
          <p className="p-4">Loading quiz data...</p>
        ) : (
          <div className="p-4">
            {attempts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Quiz Attempts</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {attempts.map((attempt) => (
                    <li key={attempt.attemptNumber} className="text-sm text-gray-600">
                      Attempt {attempt.attemptNumber} –{' '}
                      {attempt.completedAt
                        ? `${attempt.score}% (Time: ${formatTime(attempt.timeTaken)}, Date: ${formatDate(attempt.completedAt)})`
                        : 'In Progress'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}