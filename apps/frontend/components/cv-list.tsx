"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, MessageSquare, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"

// Mock CV data
// const mockCVs = [
//   {
//     id: "1",
//     user: "john@example.com",
//     filename: "john-doe-resume.pdf",
//     uploadDate: "2023-05-15T10:30:00Z",
//   },
//   {
//     id: "2",
//     user: "jane@example.com",
//     filename: "jane-smith-cv.pdf",
//     uploadDate: "2023-06-22T14:45:00Z",
//   },
//   {
//     id: "3",
//     user: "alex@example.com",
//     filename: "alex-johnson-resume.pdf",
//     uploadDate: "2023-07-10T09:15:00Z",
//   },
//   {
//     id: "4",
//     user: "sarah@example.com",
//     filename: "sarah-williams-cv.pdf",
//     uploadDate: "2023-08-05T16:20:00Z",
//   },
//   {
//     id: "5",
//     user: "michael@example.com",
//     filename: "michael-brown-resume.pdf",
//     uploadDate: "2023-09-18T11:10:00Z",
//   },
// ]

export function CVList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cvs, setCvs] = useState<any[]>([])

  const token = localStorage.getItem("token");

  // fetch CVs
  useEffect(() => {
    const fetchCvs = async () => {
      try {
        const response = await fetch("http://localhost:3003/cv", {
          headers: { 
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json()
        console.log(data)
        setCvs(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Error fetching CVs:", error)
      }
    }
    fetchCvs()
  }, [])
  
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