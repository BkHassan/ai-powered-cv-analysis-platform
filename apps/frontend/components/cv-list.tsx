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
} from "lucide-react";
import { useCVs } from "@/hooks/useCVs";
import { Skeleton } from "@/components/ui/skeleton";

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
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 bg-white/90 backdrop-blur-sm border border-purple-100">
      <CardHeader className="text-white p-4">
        <CardTitle className="text-gray-700 text-lg flex items-center gap-2">
          <User size={20} />
          {cv.name} <span className="text-sm opacity-75">(#{cv.indexId})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-700">
          <Mail size={16} />
          <span className="text-sm">{cv.email}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar size={16} />
          <span className="text-sm">
            {new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }).format(new Date(cv.uploadDate))}
          </span>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-purple-500 hover:text-white transition-colors"
            asChild
          >
            <Link href={`/admin/cvs/${cv.fileName}`}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-green-500 hover:text-white transition-colors"
            asChild
          >
            <Link
              href={`/admin/chat?fileName=${(cv.fileName)}`}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-red-500 hover:text-white transition-colors"
            onClick={() => onDelete(cv.realId)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
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
      <CardHeader className="text-white p-4">
        <CardTitle className="text-gray-700 text-lg flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </CardTitle>
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
        </div>
      </CardContent>
    </Card>
  );
}

interface CVListProps {
  refreshKey?: number;
}

export function CVList({ refreshKey = 0 }: CVListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { cvs, status, handleDelete } = useCVs(refreshKey);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const filteredCVs = cvs.filter(
    (cv) =>
      cv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <User size={24} className="text-gray-700" />
        <h2 className="text-2xl font-semibold text-gray-700">CV List</h2>
      </div>

      <Input
        placeholder="Search by email or name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <CVCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredCVs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No CVs found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCVs.map((cv) => (
            <CVCard key={cv.realId} cv={cv} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
