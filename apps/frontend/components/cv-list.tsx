"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Eye,
  MessageSquare,
  Trash2,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Calendar,
  Home,
  ChevronRight,
  Search,
  WandSparkles,
} from "lucide-react";
import { useCVs } from "@/hooks/useCVs";
import { Skeleton } from "@/components/ui/skeleton";
import { QuizResults } from "@/components/QuizResults";

interface CV {
  realId: string;
  indexId: number;
  name: string;
  email: string;
  uploadDate: string;
  fileName: string;
}

interface CVCardProps {
  cv: CV;
  onDelete: (cvId: string) => Promise<void>;
}

function CVCard({ cv, onDelete }: CVCardProps) {
  const [quizId, setQuizId] = useState<string | undefined>(undefined);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/cv/${encodeURIComponent(
            cv.fileName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch quizzes");
        }
        const data = await response.json();
        setQuizId(data.quizId);
      } catch (err: any) {
        console.error("Error fetching quizzes:", err);
        // Silently fail to avoid disrupting CV card
      } finally {
        setIsLoadingQuizzes(false);
      }
    };
    fetchQuizzes();
  }, [cv.fileName]);

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 bg-white/90 backdrop-blur-sm border border-purple-100">
      <CardHeader className="text-white px-3 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-gray-700 text-base flex items-center gap-2">
          <User size={18} />
          {cv.name} <span className="text-sm opacity-75">(#{cv.indexId})</span>
        </CardTitle>
        <div className="flex gap-1">
          {!isLoadingQuizzes && quizId && (
            <QuizResults quizId={quizId} simple />
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 py-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail size={14} />
            <span className="text-sm">{cv.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar size={14} />
            <span className="text-sm">
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(new Date(cv.uploadDate))}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="border rounded text-black hover:text-yellow-500 hover:border-yellow-500 hover:bg-white transition w-[95%] h-8"
            asChild
          >
            <Link href={`/admin/quiz/${cv.fileName}`}>
              <WandSparkles className="h-4 w-4 mr-1" />
              Quiz
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border rounded text-black hover:text-purple-500 hover:border-purple-500 hover:bg-white transition w-[95%] h-8"
            asChild
          >
            <Link href={`/admin/cvs/${cv.fileName}`}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border rounded text-black hover:text-green-500 hover:border-green-500 hover:bg-white transition w-[95%] h-8"
            asChild
          >
            <Link href={`/admin/chat?fileName=${cv.fileName}`}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Chat
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border rounded text-black hover:text-red-500 hover:border-red-500 hover:bg-white transition w-[95%] h-8"
            onClick={() => onDelete(cv.realId)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CVCardSkeleton() {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 bg-white/90 backdrop-blur-sm border border-purple-100">
      <CardHeader className="text-white p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-gray-700 text-lg flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </CardTitle>
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2 mt-4">
          <div className="flex-1">
            <Skeleton className="h-9 w-full flex items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Skeleton>
          </div>
          <div className="flex-1">
            <Skeleton className="h-9 w-full flex items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Skeleton>
          </div>
          <div className="flex-1">
            <Skeleton className="h-9 w-full flex items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Skeleton>
          </div>
          <div className="flex-1">
            <Skeleton className="h-9 w-full flex items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Skeleton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CVListProps {
  refreshKey?: number;
  isAdmin?: boolean;
}

export function CVList({ refreshKey = 0, isAdmin = false }: CVListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { cvs, loading, status, handleDelete } = useCVs(refreshKey);

  const filteredCVs = cvs.filter(
    (cv) =>
      cv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-12">
      <div className="flex items-center text-sm text-gray-700 mb-4">
        <Home className="w-5 h-5 mr-2" />
        <Link
          href="/admin"
          className="flex items-center hover:text-purple-700 transition-colors"
        >
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="font-semibold">Profils</span>
        </Link>
      </div>

      <div className="flex justify-center">
        <div className="relative w-2/4">
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 h-8 rounded-full border-gray-300 focus:border-black focus:ring-0 focus:outline-none transition-colors"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      </div>

      {status.type && (
        <Alert variant={status.type === "success" ? "default" : "destructive"}>
          {status.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <AlertTitle>
            {status.type === "success" ? "Success" : "Error"}
          </AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <CVCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredCVs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No CVs found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCVs.map((cv, i) => {
            const displayIndex = isAdmin ? cv.indexId : i + 1;
            return (
              <CVCard
                key={cv.realId}
                cv={{ ...cv, indexId: displayIndex }}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
