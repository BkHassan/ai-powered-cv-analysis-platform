"use client";

import { useState, useEffect } from "react";
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
import {
  BookOpen,
  Copy,
  Send,
  Award,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  User,
} from "lucide-react";

interface GenerateQuizProps {
  fileName: string;
  cvId: string;
  onGquizGenerated: (data: any) => void;
}

export function GenerateQuiz({
  fileName,
  cvId,
  onGquizGenerated,
}: GenerateQuizProps) {
  const [questionCount, setQuestionCount] = useState("5");
  const [cvName, setCvName] = useState("");
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

  useEffect(() => {
    const fetchCVName = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch CVs");
        }

        const cvs = await response.json();
        const cv = cvs.find((cv: any) => cv.fileName === fileName);
        if (cv) {
          setCvName(cv.name);
        }
      } catch (error) {
        console.error("Error fetching CV name:", error);
      }
    };

    fetchCVName();
  }, [fileName]);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to generate a quiz");
        return;
      }
      const questionCountNum = parseInt(questionCount);
      const timeLimit = questionCountNum * 30; // 30 seconds per question
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
            questionCount: questionCountNum,
            timeLimit,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate quiz");
      }
      const data = await response.json();
      setQuizData(data);
      onGquizGenerated(data);
      toast.success("Quiz generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!quizData?.link) {
      toast.error("No quiz link available");
      return;
    }
    // Modern Clipboard API

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard

        .writeText(quizData.link)

        .then(() => {
          toast.success("Quiz link copied!");
        })

        .catch(() => {
          toast.error("Failed to copy quiz link");
        });
      return;
    }

    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = quizData.link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Quiz link copied!");
    } catch (err) {
      toast.error("Failed to copy quiz link. Please copy it manually.");
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
        <div className="flex justify-between items-center">
          {!quizData ? (
            <>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen size={20} />
                Generate Quiz
              </CardTitle>
              <CardTitle className="text-gray-700 text-lg flex items-center gap-2">
                <User size={20} />
                {cvName}
              </CardTitle>
            </>
          ) : (
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2 mx-auto">
              Generate Quiz
            </CardTitle>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!quizData ? (
          <>
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
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2 mb-6">
              <Button onClick={handleCopyLink} size="sm" className="flex-1">
                <Copy size={14} className="mr-2" />
                Copy Link
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !quizData.candidateEmail}
                size="sm"
                className="flex-1"
              >
                <Send size={14} className="mr-2" />
                {isSending ? "Sending..." : "Send Email"}
              </Button>
              <Button
                onClick={() => setQuizData(null)}
                size="sm"
                className="flex-1"
              >
                <RefreshCw size={14} className="mr-2" />
                Generate New Quiz
              </Button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Candidate Email</Label>
                <p className="text-gray-600">
                  {quizData.candidateEmail || "No email available"}
                </p>
              </div>
              <div className="flex-1">
                <Label>Candidate Name</Label>
                <p className="text-gray-600 flex items-center gap-2 pl-2">
                  {cvName}
                </p>
              </div>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
