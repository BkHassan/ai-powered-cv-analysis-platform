"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "react-toastify";
import { BookOpen, Copy, Send } from "lucide-react";

interface GenerateQuizProps {
  fileName: string;
  cvId: string;
}

export function GenerateQuiz({ fileName, cvId }: GenerateQuizProps) {
  const [questionCount, setQuestionCount] = useState("5");
  const [quizData, setQuizData] = useState<{
    quizId: string;
    link: string;
    candidateEmail: string;
    questions: {
      id: string;
      text: string;
      options: string[];
      correct: number;
    }[];
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
    if (quizData?.link) {
      navigator.clipboard.writeText(quizData.link);
      toast.success("Quiz link copied!");
    } else {
      toast.error("No quiz link available");
    }
  };

  const handleSendEmail = async () => {
    if (!quizData?.link || !quizData?.candidateEmail) {
      toast.error("Quiz link or candidate email missing");
      return;
    }
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
              <p className="text-gray-600">{quizData.candidateEmail || "No email available"}</p>
            </div>
            <h3 className="text-lg font-medium">Generated Questions</h3>
            <div className="space-y-6">
              {quizData.questions.map((question) => (
                <div key={question.id} className="border p-4 rounded-md">
                  <p className="font-medium">{question.text}</p>
                  <RadioGroup disabled>
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={index.toString()}
                          id={`${question.id}-${index}`}
                        />
                        <Label htmlFor={`${question.id}-${index}`}>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCopyLink} className="flex-1">
                <Copy size={16} className="mr-2" />
                Copy Link
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !quizData.candidateEmail}
                className="flex-1"
              >
                <Send size={16} className="mr-2" />
                {isSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setQuizData(null)}
              className="w-full mt-2"
            >
              Generate New Quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}