"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export default function QuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Add localStorage keys
  const STORAGE_KEYS = useMemo(
    () => ({
      RULES_ACCEPTED: `quiz_${quizId}_rules_accepted`,
      QUIZ_STARTED: `quiz_${quizId}_started`,
      ANSWERS: `quiz_${quizId}_answers`,
      START_TIME: `quiz_${quizId}_start_time`,
      TIME_LEFT: `quiz_${quizId}_time_left`,
      QUESTIONS: `quiz_${quizId}_questions`,
      SUBMITTED: `quiz_${quizId}_submitted`,
    }),
    [quizId]
  );

  const [questions, setQuestions] = useState<
    { id: string; text: string; options: string[]; correct: number }[]
  >([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [startTime, setStartTime] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [lastCopyToast, setLastCopyToast] = useState<number>(0);
  const COPY_TOAST_COOLDOWN = 10000; // 10 seconds in milliseconds
  const TOAST_IDS = {
    COPY: "copy-toast",
    SHUFFLE: "shuffle-toast",
    TIME_UP: "time-up-toast",
    ANSWER_ALL: "answer-all-toast",
  };

  // Load saved state from localStorage
  useEffect(() => {
    const savedRulesAccepted = localStorage.getItem(
      STORAGE_KEYS.RULES_ACCEPTED
    );
    const savedQuizStarted = localStorage.getItem(STORAGE_KEYS.QUIZ_STARTED);
    const savedAnswers = localStorage.getItem(STORAGE_KEYS.ANSWERS);
    const savedStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
    const savedTimeLeft = localStorage.getItem(STORAGE_KEYS.TIME_LEFT);
    const savedQuestions = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    const savedSubmitted = localStorage.getItem(STORAGE_KEYS.SUBMITTED);

    if (savedRulesAccepted === "true") {
      setRulesAccepted(true);
    }
    if (savedQuizStarted === "true") {
      setQuizStarted(true);
      setShowRules(false);
    }
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
    if (savedStartTime) {
      setStartTime(parseInt(savedStartTime));
    }
    if (savedTimeLeft) {
      setTimeLeft(parseInt(savedTimeLeft));
    }
    if (savedQuestions) {
      setQuestions(JSON.parse(savedQuestions));
    }
    if (savedSubmitted === "true") {
      setSubmitted(true);
    }
  }, [STORAGE_KEYS]);

  // Save state to localStorage
  useEffect(() => {
    if (rulesAccepted) {
      localStorage.setItem(STORAGE_KEYS.RULES_ACCEPTED, "true");
    }
  }, [STORAGE_KEYS, rulesAccepted]);

  useEffect(() => {
    if (quizStarted) {
      localStorage.setItem(STORAGE_KEYS.QUIZ_STARTED, "true");
    }
  }, [STORAGE_KEYS, quizStarted]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers));
    }
  }, [STORAGE_KEYS, answers]);

  useEffect(() => {
    if (startTime > 0) {
      localStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
    }
  }, [STORAGE_KEYS, startTime]);

  useEffect(() => {
    if (timeLeft !== null) {
      localStorage.setItem(STORAGE_KEYS.TIME_LEFT, timeLeft.toString());
    }
  }, [STORAGE_KEYS, timeLeft]);

  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    }
  }, [STORAGE_KEYS, questions]);

  useEffect(() => {
    if (submitted) {
      localStorage.setItem(STORAGE_KEYS.SUBMITTED, "true");
    }
  }, [STORAGE_KEYS, submitted]);

  // Function to shuffle questions
  const shuffleQuestions = () => {
    setQuestions((prevQuestions) => {
      const shuffled = [...prevQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const handleStartQuiz = () => {
    setShowRules(false);
    setQuizStarted(true);
    const now = Date.now();
    setStartTime(now);
    setTimeLeft(timeLimit);
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!token) {
        setError("Invalid quiz link");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL
          }/quiz/${quizId}?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to load quiz");
        }
        const data = await response.json();
        setQuestions(data.questions);
        setTimeLimit(data.timeLimit || data.questions.length * 60);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching quiz:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, token]);

  // Function to show toast with cooldown
  const showToastWithCooldown = (
    message: string,
    type: "error" | "warning" | "info",
    id: string,
    cooldown: number = 0
  ) => {
    const now = Date.now();
    if (cooldown > 0 && now - lastCopyToast < cooldown) {
      return;
    }
    if (!toast.isActive(id)) {
      toast[type](message, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: true,
        toastId: id,
      });
      if (cooldown > 0) {
        setLastCopyToast(now);
      }
    }
  };

  // Timer logic
  useEffect(() => {
    if (timeLeft === null || submitted || !quizStarted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (!submitted) {
            handleSubmit();
            showToastWithCooldown(
              "Time's up! Quiz submitted automatically.",
              "error",
              TOAST_IDS.TIME_UP
            );
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, submitted, quizStarted]);

  // Prevent copying and screenshots
  useEffect(() => {
    if (submitted || !quizStarted) return; // Don't apply restrictions before quiz starts

    const disableCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showToastWithCooldown(
        "Copying is disabled during the quiz",
        "error",
        TOAST_IDS.COPY,
        COPY_TOAST_COOLDOWN
      );
    };

    const disableContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const disableKeydown = (e: KeyboardEvent) => {
      // Only prevent copy shortcuts
      if ((e.ctrlKey && e.key === "c") || (e.metaKey && e.key === "c")) {
        e.preventDefault();
        showToastWithCooldown(
          "Copying is disabled during the quiz",
          "error",
          TOAST_IDS.COPY,
          COPY_TOAST_COOLDOWN
        );
      }
    };

    // Prevent drag and drop
    const disableDrag = (e: DragEvent) => {
      e.preventDefault();
    };

    // Prevent selection
    const disableSelect = (e: Event) => {
      if (
        e.target instanceof HTMLElement &&
        !e.target.closest("input, textarea")
      ) {
        e.preventDefault();
      }
    };

    // Add event listeners
    document.addEventListener("copy", disableCopy);
    document.addEventListener("contextmenu", disableContextMenu);
    document.addEventListener("keydown", disableKeydown);
    document.addEventListener("dragstart", disableDrag);
    document.addEventListener("selectstart", disableSelect);

    // Add CSS to prevent text selection
    const style = document.createElement("style");
    style.textContent = `
      .quiz-content {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      .quiz-content input, .quiz-content textarea {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    `;
    document.head.appendChild(style);

    // Additional protection against switching tabs
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Shuffle questions when user returns to the tab
        const handleVisibilityReturn = () => {
          if (!document.hidden) {
            shuffleQuestions();
            showToastWithCooldown(
              "Questions have been shuffled!",
              "warning",
              TOAST_IDS.SHUFFLE
            );
            document.removeEventListener(
              "visibilitychange",
              handleVisibilityReturn
            );
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityReturn);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Clean up event listeners
      document.removeEventListener("copy", disableCopy);
      document.removeEventListener("contextmenu", disableContextMenu);
      document.removeEventListener("keydown", disableKeydown);
      document.removeEventListener("dragstart", disableDrag);
      document.removeEventListener("selectstart", disableSelect);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Remove style
      document.head.removeChild(style);
    };
  }, [submitted, quizStarted]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      showToastWithCooldown(
        "Please answer all questions",
        "warning",
        TOAST_IDS.ANSWER_ALL
      );
      return;
    }
    if (!token) {
      showToastWithCooldown("Invalid quiz link", "error", "invalid-link");
      return;
    }
    if (timeLeft === 0) {
      setSubmitted(true);
      showToastWithCooldown(
        "Submission time limit exceeded",
        "error",
        "time-limit"
      );
      return;
    }
    setLoading(true);
    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/quiz/${quizId}/submit?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, timeTaken }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit quiz");
      }
      setSubmitted(true);
      // Clear localStorage after successful submission
      Object.values(STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key)
      );
      showToastWithCooldown(
        "Quiz submitted successfully!",
        "info",
        "submit-success"
      );
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      showToastWithCooldown(
        err.message || "Failed to submit quiz",
        "error",
        "submit-error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {quizStarted ? (
        <Card className="w-full max-w-2xl quiz-content">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Technical Quiz</CardTitle>
              {!submitted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-5 w-5 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="w-80">
                      <h4 className="font-semibold mb-2">Quiz Rules:</h4>
                      <ul className="list-disc pl-4 pb-2 space-y-1 text-sm">
                        <li>Do not switch tabs during the test.</li>
                        <li>Do not take screenshots or copy text.</li>
                        <li>
                          The quiz is timed and auto-submits when time runs out.
                        </li>
                        <li>
                          Repeated tab switching will shuffle or end the test.
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {timeLeft !== null && !submitted && (
              <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded">
                ⏱️ Time Left: {formatTime(timeLeft)}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading quiz...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : submitted ? (
              <p className="text-green-500">
                Thank you for completing the quiz!
              </p>
            ) : (
              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <p className="font-medium">{question.text}</p>
                    <RadioGroup
                      onValueChange={(value) =>
                        handleAnswerChange(question.id, value)
                      }
                    >
                      {question.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
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
                <Button
                  onClick={handleSubmit}
                  disabled={loading || timeLeft === 0}
                >
                  Submit Quiz
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={showRules && !quizStarted}
        onOpenChange={() => {}} // Prevent closing by clicking outside
        modal={true} // Ensure modal behavior
      >
        <DialogContent className="backdrop-blur-sm bg-white/95">
          <DialogHeader>
            <DialogTitle>Quiz Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ul className="list-disc pl-4 space-y-2">
              <li>Do not switch tabs during the test.</li>
              <li>Do not take screenshots or copy text.</li>
              <li>The quiz is timed and auto-submits when time runs out.</li>
              <li>Repeated tab switching will shuffle or end the test.</li>
            </ul>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="modal-rules"
                checked={rulesAccepted}
                onCheckedChange={(checked) =>
                  setRulesAccepted(checked as boolean)
                }
              />
              <Label htmlFor="modal-rules">
                I have read and agree to the rules above.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleStartQuiz}
              disabled={!rulesAccepted}
              className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
