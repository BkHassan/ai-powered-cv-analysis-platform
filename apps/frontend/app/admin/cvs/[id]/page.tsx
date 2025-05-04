"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function CVDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("CV not found");
          } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            router.push("/login");
            throw new Error("Session expired or unauthorized. Please log in again.");
          } else {
            throw new Error("Failed to load CV");
          }
        }

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get("content-disposition");
        const match = contentDisposition?.match(/filename="(.+)"/);
        const extractedFileName = match ? match[1] : `cv-${id}.pdf`;
        setFileName(extractedFileName);

        // Create Blob from response body
        const pdfBlob = await response.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error("Error fetching CV:", err);
        setError(err.message || "Failed to load CV. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCV();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [id, token]);

  const handleDownload = () => {
    if (pdfUrl && fileName) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto pt-24 pb-10 px-4">
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/cvs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to CV List
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading CV...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">{error}</h2>
            <p className="text-muted-foreground mb-6">
              {error.includes("not found")
                ? "The CV you're looking for doesn't exist or has been removed."
                : error.includes("expired") || error.includes("unauthorized")
                ? "Please check your permissions or log in."
                : "Please try again later."}
            </p>
            <Button asChild>
              <Link href="/admin/cvs">Return to CV List</Link>
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">{fileName}</h1>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/admin/chat?cvId=${id}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with this CV
                  </Link>
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                {pdfUrl && (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[80vh] border-0"
                    title="CV Preview"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}