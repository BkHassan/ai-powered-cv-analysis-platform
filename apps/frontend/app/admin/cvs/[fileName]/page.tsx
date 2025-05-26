"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";

export default function CVDetailPage({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = use(params);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resolvedFileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    if (!storedToken) {
      router.replace("/");
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Fetch CV
  useEffect(() => {
    const fetchCV = async () => {
      if (!token) {
        setError("Please log in to view the CV");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/cv/${encodeURIComponent(
            fileName
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          if (response.status === 404) throw new Error("CV not found");
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            setTimeout(() => router.replace("/"), 0);
            return;
          }
          throw new Error("Failed to load CV");
        }

        const contentDisposition = response.headers.get("content-disposition");
        const match = contentDisposition?.match(/filename="(.+)"/);
        const extractedFileName = match ? match[1] : `cv-${fileName}.pdf`;
        setFileName(extractedFileName);

        const pdfBlob = await response.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error("Error fetching CV:", err);
        setError(err.message || "Failed to load CV");
      } finally {
        setLoading(false);
      }
    };

    if (token && !isCheckingAuth) fetchCV();

    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [fileName, token, isCheckingAuth]);

  const handleDownload = () => {
    if (pdfUrl && resolvedFileName) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Render after all hooks
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-24 pb-10 px-4">
        <div className="container mx-auto mb-6 flex justify-between items-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/cvs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profils
            </Link>
          </Button>
          {!loading && !error && pdfUrl && (
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download CV
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-pink-100">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="container mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-2">{error}</h2>
            <Button asChild>
              <Link href="/admin/cvs">Return to Profils</Link>
            </Button>
          </div>
        ) : (
          <div className="container mx-auto">
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                className="w-full h-screen border-0"
                title="CV Preview"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
