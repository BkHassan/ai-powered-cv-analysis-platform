"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/router"

export function UploadCV() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = localStorage.getItem("token")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)

    // Reset status when a new file is selected
    if (selectedFile) {
      setStatus({ type: null, message: "" })
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setStatus({ type: "error", message: "Please select a file to upload" })
      return
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", message: "Only PDF files are accepted" })
      return
    }

    if (!token) {
      setStatus({ type: "error", message: "Please log in to upload a CV" })
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("http://localhost:3003/cv/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Invalid file or duplicate CV")
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("You are not authorized to upload a CV")
        } else {
          throw new Error("Failed to upload CV")
        }
      }

      const data = await response.json()
      setStatus({
        type: "success",
        message: `CV uploaded successfully! CV ID: ${data.cvId}`,
      })
      setFile(null)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("Error uploading CV:", error)
      setStatus({
        type: "error",
        message: error.message || "Failed to upload CV. Please try again.",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Upload size={20} />
          Upload CV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">Only PDF files are accepted</p>
          </div>

          {status.type && (
            <Alert variant={status.type === "success" ? "default" : "destructive"}>
              {status.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{status.type === "success" ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload CV"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}