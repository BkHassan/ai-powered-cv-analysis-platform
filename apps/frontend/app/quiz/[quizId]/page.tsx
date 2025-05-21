"use client";

import { useState, useEffect, use, useMemo, useCallback } from "react";
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

  const STORAGE_KEYS = useMemo(
    () => ({
      RULES_ACCEPTED: `quiz_${quizId}_rules_accepted`,
      QUIZ_STARTED: `quiz_${quizId}_started`,
      ANSWERS: `quiz_${quizId}_answers`,
      START_TIME: `quiz_${quizId}_start_time`,
      TIME_LEFT: `quiz_${quizId}_time_left`,
      QUESTIONS: `quiz_${quizId}_questions`,
      SUBMITTED: `quiz_${quizId}_submitted`,
      QUIZ_TOKEN: `quiz_${quizId}_token`,
      TAB_LOCK: `quiz_${quizId}_tab_lock`,
      TAB_ID: `quiz_${quizId}_tab_id`,
    }),
    [quizId]
  );

  const tabId = useMemo(() => Math.random().toString(36).substring(2), []);

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
  const [isRulesTooltipOpen, setIsRulesTooltipOpen] = useState(false);
  const COPY_TOAST_COOLDOWN = 10000;
  const TOAST_IDS = {
    COPY: "copy-toast",
    SHUFFLE: "shuffle-toast",
    TIME_UP: "time-up-toast",
    ANSWER_ALL: "answer-all-toast",
  };

  useEffect(() => {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (key.startsWith("quiz_") && !key.startsWith(`quiz_${quizId}_`)) {
        localStorage.removeItem(key);
      }
    });
  }, [quizId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem(STORAGE_KEYS.TAB_LOCK);
      localStorage.removeItem(STORAGE_KEYS.TAB_ID);
    };

    const checkTabLock = () => {
      const existingLock = localStorage.getItem(STORAGE_KEYS.TAB_LOCK);
      const existingTabId = localStorage.getItem(STORAGE_KEYS.TAB_ID);
      const existingToken = localStorage.getItem(STORAGE_KEYS.QUIZ_TOKEN);

      if (existingLock && existingToken !== token) {
        localStorage.removeItem(STORAGE_KEYS.TAB_LOCK);
        localStorage.removeItem(STORAGE_KEYS.TAB_ID);
      } else if (existingLock && existingToken === token) {
        if (existingTabId === tabId) {
          return;
        }
        const lastActivity = localStorage.getItem(
          `${STORAGE_KEYS.TAB_ID}_last_activity`
        );
        if (lastActivity && Date.now() - parseInt(lastActivity) < 5000) {
          setError(
            "This quiz is already open in another tab. Please use that tab to continue."
          );
          return;
        } else {
          localStorage.removeItem(STORAGE_KEYS.TAB_LOCK);
          localStorage.removeItem(STORAGE_KEYS.TAB_ID);
        }
      }

      localStorage.setItem(STORAGE_KEYS.TAB_LOCK, "true");
      localStorage.setItem(STORAGE_KEYS.TAB_ID, tabId);
      localStorage.setItem(STORAGE_KEYS.QUIZ_TOKEN, token || "");
    };

    checkTabLock();
    const activityInterval = setInterval(() => {
      localStorage.setItem(
        `${STORAGE_KEYS.TAB_ID}_last_activity`,
        Date.now().toString()
      );
    }, 1000);

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEYS.TAB_LOCK) {
        checkTabLock();
      }
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(activityInterval);
      localStorage.removeItem(STORAGE_KEYS.TAB_LOCK);
      localStorage.removeItem(STORAGE_KEYS.TAB_ID);
      localStorage.removeItem(`${STORAGE_KEYS.TAB_ID}_last_activity`);
    };
  }, [STORAGE_KEYS, token, tabId]);

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
    const savedToken = localStorage.getItem(STORAGE_KEYS.QUIZ_TOKEN);

    if (savedToken !== token) {
      Object.values(STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key)
      );
      return;
    }

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
      setShowRules(false);
      setQuizStarted(true);
    } else {
      setSubmitted(false);
    }
  }, [STORAGE_KEYS, token]);

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
    if (timeLeft !== null && timeLeft >= 0) {
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

  const shuffleQuestions = () => {
    setQuestions((prevQuestions) => {
      const shuffled = [...prevQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(shuffled));
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
        const savedQuestions = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
        const savedQuizStarted = localStorage.getItem(
          STORAGE_KEYS.QUIZ_STARTED
        );

        // If we have saved questions AND the quiz was previously started, use those
        if (savedQuestions && savedQuizStarted === "true") {
          setQuestions(JSON.parse(savedQuestions));
          const savedTimeLeft = localStorage.getItem(STORAGE_KEYS.TIME_LEFT);
          if (savedTimeLeft) {
            setTimeLeft(parseInt(savedTimeLeft));
          }
          setLoading(false);
          return;
        }

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
        setTimeLimit(data.timeLimit || data.questions.length * 30);
        setTimeLeft(data.timeLimit || data.questions.length * 30);
        if (data.completedAt) {
          setSubmitted(true);
          setShowRules(false);
          setQuizStarted(true);
        }
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching quiz:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, token, STORAGE_KEYS]);

  const showToastWithCooldown = useCallback(
    (
      message: string,
      type: "error" | "warning" | "info",
      id: string,
      cooldown: number = 0
    ) => {
      if (!toast.isActive(id)) {
        toast[type](message, {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: true,
          toastId: id,
        });
        if (cooldown > 0) {
          setTimeout(() => setLastCopyToast(Date.now()), 0);
        }
      }
    },
    []
  );

  const handleAutoSubmit = async () => {
    if (submitted) return;

    setLoading(true);
    try {
      const timeTaken = timeLimit !== null ? timeLimit : 0;

      // We'll submit whatever answers the candidate has provided, even if incomplete
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/quiz/${quizId}/submit?token=${encodeURIComponent(token!)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            timeTaken,
            isAutoSubmit: true, // Add a flag to indicate this is an auto-submission
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        // Even if submission fails, mark as submitted locally to prevent further attempts
        setSubmitted(true);
        Object.values(STORAGE_KEYS).forEach((key) =>
          localStorage.removeItem(key)
        );
        showToastWithCooldown(
          "Time's up! Your answers have been recorded.",
          "info",
          TOAST_IDS.TIME_UP
        );
        return;
      }

      setSubmitted(true);
      Object.values(STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key)
      );

      showToastWithCooldown(
        "Time's up! Your quiz has been automatically submitted.",
        "info",
        TOAST_IDS.TIME_UP
      );
    } catch (err: any) {
      console.error("Error auto-submitting quiz:", err);
      // Even if submission fails with an exception, mark as submitted locally
      setSubmitted(true);
      Object.values(STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key)
      );
      showToastWithCooldown(
        "Time's up! Your quiz session has ended.",
        "info",
        TOAST_IDS.TIME_UP
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || submitted || !quizStarted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);

          if (!submitted) {
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, submitted, quizStarted]);

  useEffect(() => {
    if (submitted || !quizStarted || timeLeft === null || timeLeft <= 0) return;

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

    const disableDrag = (e: DragEvent) => {
      e.preventDefault();
    };

    const disableSelect = (e: Event) => {
      if (
        e.target instanceof HTMLElement &&
        !e.target.closest("input, textarea")
      ) {
        e.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const handleVisibilityReturn = () => {
          if (!document.hidden && timeLeft > 0 && !loading && !submitted) {
            shuffleQuestions();
            showToastWithCooldown(
              "Questions have been shuffled!",
              "warning",
              TOAST_IDS.SHUFFLE
            );
          }
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityReturn
          );
        };
        document.addEventListener("visibilitychange", handleVisibilityReturn);
      }
    };

    document.addEventListener("copy", disableCopy);
    document.addEventListener("contextmenu", disableContextMenu);
    document.addEventListener("keydown", disableKeydown);
    document.addEventListener("dragstart", disableDrag);
    document.addEventListener("selectstart", disableSelect);
    document.addEventListener("visibilitychange", handleVisibilityChange);

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

    return () => {
      document.removeEventListener("copy", disableCopy);
      document.removeEventListener("contextmenu", disableContextMenu);
      document.removeEventListener("keydown", disableKeydown);
      document.removeEventListener("dragstart", disableDrag);
      document.removeEventListener("selectstart", disableSelect);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.head.removeChild(style);
    };
  }, [
    submitted,
    quizStarted,
    timeLeft,
    showToastWithCooldown,
    STORAGE_KEYS,
    TOAST_IDS,
  ]);

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
    if (submitted) {
      showToastWithCooldown(
        "Quiz has already been submitted",
        "error",
        "already-submitted"
      );
      return;
    }
    setLoading(true);
    try {
      const timeTaken =
        timeLimit !== null && timeLeft !== null ? timeLimit - timeLeft : 0;
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
                  <Tooltip
                    open={isRulesTooltipOpen}
                    onOpenChange={setIsRulesTooltipOpen}
                  >
                    <TooltipTrigger>
                      <Info className="h-5 w-5 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="w-80">
                      <h4 className="font-semibold mb-2">Quiz Rules:</h4>
                      <ul className="list-disc pl-4 pb-2 space-y-1 text-sm">
                        <li>Do not switch tabs during the test.</li>
                        <li>Do not take screenshots or copy text.</li>
                        <li>
                          The quiz is timed and must be submitted before time
                          runs out.
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
                      disabled={timeLeft === 0}
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
                  disabled={loading || timeLeft === 0 || submitted}
                >
                  Submit Quiz
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={!loading && showRules && !quizStarted}
        onOpenChange={() => {}}
        modal={true}
      >
        <DialogContent className="backdrop-blur-sm bg-white/95">
          <DialogHeader>
            <DialogTitle>Quiz Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ul className="list-disc pl-4 space-y-2">
              <li>Do not switch tabs during the test.</li>
              <li>Do not take screenshots or copy text.</li>
              <li>
                The quiz is timed and must be submitted before time runs out.
              </li>
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
