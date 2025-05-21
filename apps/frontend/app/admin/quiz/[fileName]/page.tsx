"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { GenerateQuiz } from "@/components/generate-quiz";
import { QuizAttemptList } from "@/components/QuizAttemptList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function QuizGenerationPage({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = use(params);
  const [quizData, setQuizData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-24 pb-10 px-4">
        {/* Top bar with Back button */}
        <div className="container mx-auto mb-6 flex justify-between items-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/cvs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quiz List
            </Link>
          </Button>
        </div>

        {/* Main content */}
        <div className="container mx-auto flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <GenerateQuiz
              fileName={fileName}
              cvId={fileName}
              onGquizGenerated={setQuizData}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
            />
            {isExpanded && !quizData && <QuizAttemptList fileName={fileName} />}
          </div>
        </div>
      </main>
    </div>
  );
}
