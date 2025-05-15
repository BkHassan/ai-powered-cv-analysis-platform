"use client";

import { useState, useEffect, use } from "react";
import { GenerateQuiz } from "@/components/generate-quiz";
import { Card } from "@/components/ui/card";
import { toast } from "react-toastify";
import { QuizResults } from "@/components/QuizResults";

export default function QuizGenerationPage({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = use(params);
  const [quizId, setQuizId] = useState<string | undefined>(undefined);
  const [attempts, setAttempts] = useState<
    { attemptNumber: number; score?: number; completedAt?: string }[]
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

        // Fetch latest quiz
        const quizResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/cv/${encodeURIComponent(fileName)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!quizResponse.ok) {
          const errorData = await quizResponse.json();
          throw new Error(errorData.message || "Failed to fetch quiz");
        }
        const quizData = await quizResponse.json();
        setQuizId(quizData.quizId);

        // Fetch attempts
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
        setAttempts(attemptsData);
      } catch (err: any) {
        toast.error(err.message || "Failed to load quiz data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fileName]);

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
                      {attempt.completedAt ? `${attempt.score}%` : 'In Progress'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {quizId ? (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4">Latest Quiz Result</h3>
                <QuizResults quizId={quizId} simple={false} />
              </div>
            ) : (
              <p className="text-gray-500">No quiz generated for this CV yet.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}