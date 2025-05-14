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
  const [quizIds, setQuizIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please log in to view quizzes");
          return;
        }
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/cv/${encodeURIComponent(fileName)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch quizzes");
        }
        const data = await response.json();
        setQuizIds(data.quizIds || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [fileName]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <GenerateQuiz fileName={fileName} cvId={fileName} />
        {loading ? (
          <p className="p-4">Loading quizzes...</p>
        ) : quizIds.length > 0 ? (
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">Existing Quizzes</h3>
            <div className="space-y-2">
              {quizIds.map((quizId) => (
                <div key={quizId} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Quiz {quizId.slice(0, 8)}...
                  </span>
                  <QuizResults quizId={quizId} simple />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="p-4 text-gray-500">No quizzes generated for this CV yet.</p>
        )}
      </Card>
    </div>
  );
}