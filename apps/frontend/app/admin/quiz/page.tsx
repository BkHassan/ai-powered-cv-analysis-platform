"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";

export default function QuizListPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [quizzes, setQuizzes] = useState<
    { quizId: string; fileName: string; createdBy: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
    } else {
      setIsCheckingAuth(false);
      fetchQuizzes(token);
    }
  }, [router]);

  const fetchQuizzes = async (token: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/list`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch quizzes");
      }
      const data = await response.json();
      setQuizzes(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load quizzes");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-4">
        <h1 className="text-3xl font-bold mb-8">Quizzes</h1>
        {loading ? (
          <p>Loading quizzes...</p>
        ) : quizzes.length > 0 ? (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.quizId}>
                <CardHeader>
                  <CardTitle>Quiz for CV: {quiz.fileName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Created by: {quiz.createdBy}</p>
                  <p>Created at: {new Date(quiz.createdAt).toLocaleString()}</p>
                  <a
                    href={`/admin/quiz/${quiz.fileName}`}
                    className="text-blue-500 hover:underline"
                  >
                    View Quiz
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No quizzes available.</p>
        )}
      </main>
    </div>
  );
}
