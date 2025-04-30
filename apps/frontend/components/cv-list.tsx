"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, MessageSquare, FileText, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useSearchParams } from "next/navigation"

export function CVList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cvs, setCvs] = useState<any[]>([])
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");
  const token = localStorage.getItem("token")

  // Fetch CVs
  const fetchCvs = async () => {
    try {
      const response = await fetch("http://localhost:3003/cv", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch CVs")
      }

      const data = await response.json()
      setCvs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching CVs:", error)
      setStatus({ type: "error", message: "Failed to load CVs. Please try again." })
    }
  }

  useEffect(() => {
    if (token) {
      fetchCvs()
    } else {
      setStatus({ type: "error", message: "Please log in to view CVs" })
    }
  }, [token, refresh])

  // Handle CV deletion
  const handleDelete = async (cvId: string) => {
    if (!token) {
      setStatus({ type: "error", message: "Please log in to delete a CV" })
      return
    }

    if (!confirm(`Are you sure you want to delete CV ${cvId}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:3003/cv/${cvId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("CV not found")
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("You are not authorized to delete this CV")
        } else {
          throw new Error("Failed to delete CV")
        }
      }

      // Refresh CV list
      await fetchCvs()
      setStatus({ type: "success", message: `CV ${cvId} deleted successfully` })

      // Clear status after 5 seconds
      setTimeout(() => setStatus({ type: null, message: "" }), 5000)
    } catch (error: any) {
      console.error("Error deleting CV:", error)
      setStatus({
        type: "error",
        message: error.message || "Failed to delete CV. Please try again.",
      })
    }
  }

  // Filter CVs based on search term
  const filteredCVs = cvs.filter(
    (cv) =>
      cv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cv.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText size={20} />
          CV List
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />

          {status.type && (
            <Alert variant={status.type === "success" ? "default" : "destructive"}>
              {status.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{status.type === "success" ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCVs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No CVs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCVs.map((cv) => (
                    <TableRow key={cv.realId}>
                      <TableCell className="font-medium">{cv.indexId}</TableCell>
                      <TableCell>{cv.name}</TableCell>
                      <TableCell>{cv.email}</TableCell>
                      <TableCell>{formatDate(cv.uploadDate)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/cvs/${cv.realId}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/chat?cvId=${cv.realId}`}>
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Chat
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(cv.realId)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}