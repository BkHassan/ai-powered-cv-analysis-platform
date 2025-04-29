"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function UploadCV() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    setUploading(true)

    try {
      // Mock upload - in a real app, you would send the file to your API
      console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type)

      // Simulate network delay
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", "Jane")
      formData.append("email", "jane@example.com")

      setStatus({ type: "success", message: "CV uploaded successfully!" })
      setFile(null)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      setStatus({ type: "error", message: "Failed to upload CV. Please try again." })
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