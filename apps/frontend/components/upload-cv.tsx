"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set worker for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface CvData {
  realId: string;
  name: string;
  email: string;
  uploadDate: string;
  uploadedBy: string;
  filePath: string | null;
  downloadUrl: string;
}

export default function CVDetailPage({ params }: { params: { id: string } }) {
  const [cv, setCV] = useState<CvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const token = localStorage.getItem("token");
  const pdfUrl = `http://localhost:3003/cv/${params.id}`;
  
  useEffect(() => {
    const fetchPdfBlob = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(pdfUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch PDF");
        const blob = await response.blob();
        setPdfBlob(blob);
      } catch (err) {
        console.error("Error fetching PDF:", err);
        setError("Failed to load PDF");
      }
    };

    fetchPdfBlob();
  }, [pdfUrl]);

  // useEffect(() => {
  //   const fetchCV = async () => {
  //     setLoading(true);
  //     setError(null);
  //     try {
  //       const token = localStorage.getItem("token");
  //       const response = await fetch(`http://localhost:3003/cv`, {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });
  //       if (!response.ok) throw new Error("Failed to fetch CV");
  //       const cvs = await response.json();
  //       const cvData = cvs.find((c: CvData) => c.realId === params.id);
  //       if (!cvData) throw new Error("CV not found");
  //       setCV(cvData);
  //     } catch (err) {
  //       console.error("Error fetching CV:", err);
  //       setError("Failed to load CV details");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchCV();
  // }, [params.id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3003/cv/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to download CV");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cv?.name ? `${cv.name}.pdf` : `cv_${params.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download CV");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
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
            <p>Loading CV details...</p>
          </div>
        ) : error || !cv ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">CV Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error ||
                "The CV you're looking for doesn't exist or has been removed."}
            </p>
            <Button asChild>
              <Link href="/admin/cvs">Return to CV List</Link>
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">{cv.name}.pdf</h1>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/admin/chat?cvId=${cv.realId}`}>
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

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      User
                    </h3>
                    <p className="text-lg">{cv.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Upload Date
                    </h3>
                    <p className="text-lg">{formatDate(cv.uploadDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-4">CV Preview</h2>
                <div className="border rounded-lg overflow-auto max-h-[600px]">
                  <Document
                    file={pdfBlob || undefined}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) =>
                      setError("Failed to load PDF: " + err.message)
                    }
                  >
                    {Array.from(new Array(numPages || 0), (_, index) => (
                      <Page key={`page_${index + 1}`} pageNumber={index + 1} />
                    ))}
                  </Document>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
