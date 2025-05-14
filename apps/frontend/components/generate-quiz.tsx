"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import { BookOpen, Copy, Send } from "lucide-react";

interface GenerateQuizProps {
  fileName: string;
  cvId: string;
}

export function GenerateQuiz({ fileName, cvId }: GenerateQuizProps) {
  const [candidateEmail, setCandidateEmail] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [quizData, setQuizData] = useState<{
    quizId: string;
    link: string;
    questions: {
      id: string;
      text: string;
      options: string[];
      correct: number;
    }[];
    candidateEmail: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to generate a quiz");
        return;
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            questionCount: parseInt(questionCount),
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate quiz");
      }
      const data = await response.json();
      setQuizData(data);
      toast.success("Quiz generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (quizData?.link || quizData?.candidateEmail) {
      navigator.clipboard.writeText(quizData.link);
      toast.success("Quiz link copied to clipboard!");
    }
  };

  const handleSendEmail = async () => {
    if (!quizData?.link) return;
    setIsSending(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: quizData.candidateEmail,
            quizLink: quizData.link,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send email");
      }
      toast.success("Quiz email sent successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen size={20} />
          Generate Quiz
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!quizData ? (
          <form onSubmit={handleGenerateQuiz} className="space-y-4">
            <div>
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Select
                value={questionCount}
                onValueChange={setQuestionCount}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select number of questions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="8">8 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isGenerating} className="w-full">
              {isGenerating ? "Generating..." : "Generate Quiz"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Candidate Email</Label>
              <p className="text-gray-600">{quizData.candidateEmail}</p>
            </div>
            <h3 className="text-lg font-medium">Generated Questions</h3>
            {quizData.questions.map((question) => (
              <div key={question.id} className="border p-4 rounded-md">
                <p className="font-medium">{question.text}</p>
                <ul className="list-disc pl-5 mt-2">
                  {question.options.map((option, index) => (
                    <li
                      key={index}
                      className={
                        index === question.correct ? "text-green-600" : ""
                      }
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex space-x-2">
              <Button onClick={handleCopyLink} className="flex-1">
                <Copy size={16} className="mr-2" />
                Copy Link
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending}
                className="flex-1"
              >
                <Send size={16} className="mr-2" />
                {isSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
