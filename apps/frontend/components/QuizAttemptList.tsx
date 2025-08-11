import { useQuizAttempts } from "@/hooks/useQuizAttempts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Clock, Calendar, Award, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface QuizAttemptListProps {
  fileName: string;
}

export function QuizAttemptList({ fileName }: QuizAttemptListProps) {
  const { attempts, loading, error } = useQuizAttempts(fileName);
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (seconds: number | undefined) => {
    if (!seconds && seconds !== 0) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateStr));
  };

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <Card className="mt-2 border-gray-200 shadow-sm">
        <CardContent className="p-3">
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Only show last 3 attempts
  const recentAttempts = attempts.slice(-3).reverse();

  return (
    <Card className="mt-2 border-gray-200 shadow-sm">
      <CardHeader className="p-3 pb-0">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-md p-1 -m-1 mb-2 select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Award className="h-4 w-4 text-gray-400" />
            Quiz Attempts
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-3">
          {attempts.length === 0 ? (
            <div className="flex items-center py-2 px-3 bg-gray-50/50 rounded-md text-sm border border-gray-100">
              <span className="text-gray-500">No Attempts stored Yet</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAttempts.map((attempt, index) => (
                <div
                  key={attempt.attemptNumber}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50/50 rounded-md text-sm border border-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <Award className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-700">
                      Attempt {recentAttempts.length - index}
                    </span>
                  </div>
                  {attempt.completedAt ? (
                    <div className="flex items-center space-x-3 text-gray-500">
                      <span className="flex items-center">
                        <Award className="h-3 w-3 mr-1" />
                        {attempt.score}%
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(attempt.timeTaken)}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(attempt.completedAt)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-amber-500">In Progress</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
