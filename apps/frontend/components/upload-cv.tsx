"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

interface UploadCVProps {
  onUploadSuccess?: () => void;
}

export function UploadCV({ onUploadSuccess }: UploadCVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const token = localStorage.getItem("token");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    // Reset status when a new file is selected
    if (selectedFile) {
      setStatus({ type: null, message: "" });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setStatus({ type: "error", message: "Please select a file to upload" });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", message: "Only PDF files are accepted" });
      return;
    }

    if (!token) {
      setStatus({ type: "error", message: "Please log in to upload a CV" });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:3003/cv/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Invalid file or duplicate CV");
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("You are not authorized to upload a CV");
        } else {
          throw new Error("Failed to upload CV");
        }
      }

      const data = await response.json();
      setStatus({
        type: "success",
        message: `CV uploaded successfully! CV ID: ${data.cvId}`,
      });
      setFile(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notify parent of successful upload
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Redirect to chat with new CV
      router.push(`/admin/chat?cvId=${data.cvId}`);
    } catch (error: any) {
      console.error("Error uploading CV:", error);
      setStatus({
        type: "error",
        message: error.message || "Failed to upload CV. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Upload size={20} />
          Upload CV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out hover:bg-blue-50 focus:ring-4 focus:ring-blue-300"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5A5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="text-gray-800 truncate max-w-xs">
                      <span className="font-semibold">Selected:</span> {file.name}
                    </p>
                    <p className="text-xs text-gray-500">Click or drag to replace</p>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5A5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="text-sm text-gray-600 font-semibold">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">Only PDF files are accepted</p>
                  </>
                )}
              </div>
              <input
                id="dropzone-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {status.type && (
            <Alert
              variant={status.type === "success" ? "default" : "destructive"}
              className="mt-4"
            >
              {status.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {status.type === "success" ? "Success" : "Error"}
              </AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-2 px-4 text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400"
          >
            {uploading ? "Uploading..." : "Upload CV"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
