"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { GenerateQuiz } from "@/components/generate-quiz";
import { QuizAttemptList } from "@/components/QuizAttemptList";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function QuizGenerationPage({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = use(params);
  const [quizData, setQuizData] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-24 pb-10 px-4">
        {/* Top bar with Back button */}
        <div className="flex items-center text-sm text-gray-700 mb-4 pl-9">
          <Home className="w-5 h-5 mr-2" />
          <Link
            href="/admin/cvs"
            className="flex items-center hover:text-purple-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="font-semibold">Quiz</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="container mx-auto flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <GenerateQuiz
              fileName={fileName}
              cvId={fileName}
              onGquizGenerated={setQuizData}
            />
            {!quizData && <QuizAttemptList fileName={fileName} />}
          </div>
        </div>
      </main>
    </div>
  );
}
