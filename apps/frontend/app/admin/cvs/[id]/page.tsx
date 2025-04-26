"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Download, MessageSquare } from "lucide-react"
import Link from "next/link"

// Mock CV data
const mockCVs = {
  "1": {
    id: "1",
    user: "john@example.com",
    filename: "john-doe-resume.pdf",
    uploadDate: "2023-05-15T10:30:00Z",
    skills: ["JavaScript", "React", "Node.js", "TypeScript"],
    experience: [
      { company: "Tech Corp", position: "Senior Developer", years: "2020-2023" },
      { company: "Web Solutions", position: "Frontend Developer", years: "2018-2020" },
    ],
    education: [{ institution: "University of Technology", degree: "BSc Computer Science", year: "2018" }],
  },
  "2": {
    id: "2",
    user: "jane@example.com",
    filename: "jane-smith-cv.pdf",
    uploadDate: "2023-06-22T14:45:00Z",
    skills: ["Python", "Data Analysis", "Machine Learning", "SQL"],
    experience: [
      { company: "Data Insights", position: "Data Scientist", years: "2019-2023" },
      { company: "Analytics Co", position: "Data Analyst", years: "2017-2019" },
    ],
    education: [
      { institution: "State University", degree: "MSc Data Science", year: "2017" },
      { institution: "City College", degree: "BSc Statistics", year: "2015" },
    ],
  },
  "3": {
    id: "3",
    user: "alex@example.com",
    filename: "alex-johnson-resume.pdf",
    uploadDate: "2023-07-10T09:15:00Z",
    skills: ["UI/UX Design", "Figma", "Adobe XD", "HTML/CSS"],
    experience: [
      { company: "Creative Design", position: "Senior UI Designer", years: "2021-2023" },
      { company: "Digital Agency", position: "UX Designer", years: "2018-2021" },
    ],
    education: [{ institution: "Design Institute", degree: "BA Graphic Design", year: "2018" }],
  },
}

export default function CVDetailPage({ params }: { params: { id: string } }) {
  const [cv, setCV] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API fetch
    const fetchCV = async () => {
      setLoading(true)
      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800))

        const cvData = mockCVs[params.id as keyof typeof mockCVs]
        setCV(cvData || null)
      } catch (error) {
        console.error("Error fetching CV:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCV()
  }, [params.id])

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

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
        ) : !cv ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">CV Not Found</h2>
            <p className="text-muted-foreground mb-6">The CV you're looking for doesn't exist or has been removed.</p>
            <Button asChild>
              <Link href="/admin/cvs">Return to CV List</Link>
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">{cv.filename}</h1>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/admin/chat?cvId=${cv.id}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with this CV
                  </Link>
                </Button>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">User</h3>
                    <p className="text-lg">{cv.user}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Upload Date</h3>
                    <p className="text-lg">{formatDate(cv.uploadDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {cv.skills.map((skill: string) => (
                      <span key={skill} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Experience</h2>
                  <div className="space-y-4">
                    {cv.experience.map((exp: any, index: number) => (
                      <div key={index}>
                        <h3 className="font-semibold">{exp.position}</h3>
                        <p className="text-muted-foreground">
                          {exp.company} • {exp.years}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Education</h2>
                  <div className="space-y-4">
                    {cv.education.map((edu: any, index: number) => (
                      <div key={index}>
                        <h3 className="font-semibold">{edu.degree}</h3>
                        <p className="text-muted-foreground">
                          {edu.institution} • {edu.year}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
