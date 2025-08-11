import { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface QuizAttempt {
  attemptNumber: number;
  score?: number;
  completedAt?: string;
  timeTaken?: number;
}

export function useQuizAttempts(fileName: string) {
  const [state, setState] = useState<{
    attempts: QuizAttempt[];
    loading: boolean;
    error: string | null;
  }>({
    attempts: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Please log in to view quizzes");
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/cv/${encodeURIComponent(fileName)}/attempts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch quiz attempts");
        }
        const data = await response.json();
        setState({
          attempts: data.slice(-3), // Last 3 attempts
          loading: false,
          error: null,
        });
      } catch (err: any) {
        setState({
          attempts: [],
          loading: false,
          error: err.message || "Failed to load quiz data",
        });
        toast.error(err.message || "Failed to load quiz data");
      }
    };
    fetchAttempts();
  }, [fileName]);

  return state;
}