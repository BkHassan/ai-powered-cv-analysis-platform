"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

export default function QuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = use(params);
  const [questions, setQuestions] = useState<
    { id: string; text: string; options: string[]; correct: number }[]
  >([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/${quizId}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          if (response.status === 404) throw new Error("Quiz not found");
          throw new Error("Failed to load quiz");
        }
        const data = await response.json();
        setQuestions(data.questions);
      } catch (err: any) {
        console.error("Error fetching quiz:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      toast.error("Please answer all questions");
      return;
    }
    setLoading(true);
    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/${quizId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, timeTaken }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }
      setSubmitted(true);
      toast.success("Quiz submitted successfully!");
    } catch (err) {
      console.error("Error submitting quiz:", err);
      toast.error("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Technical Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading quiz...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : submitted ? (
            <p className="text-green-500">Thank you for completing the quiz!</p>
          ) : (
            <div className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <p className="font-medium">{question.text}</p>
                  <RadioGroup
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                  >
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={index.toString()} id={`${question.id}-${index}`} />
                        <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <Button onClick={handleSubmit} disabled={loading}>
                Submit Quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}