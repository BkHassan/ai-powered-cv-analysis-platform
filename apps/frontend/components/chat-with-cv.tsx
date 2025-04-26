"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, User } from "lucide-react"

// Mock CV data
const mockCVs = [
  { id: "1", user: "john@example.com", filename: "john-doe-resume.pdf" },
  { id: "2", user: "jane@example.com", filename: "jane-smith-cv.pdf" },
  { id: "3", user: "alex@example.com", filename: "alex-johnson-resume.pdf" },
]

// Mock initial chat for each CV
const mockInitialChats: Record<string, { role: "user" | "assistant"; content: string }[]> = {
  "1": [{ role: "assistant", content: "I've analyzed John's CV. What would you like to know?" }],
  "2": [{ role: "assistant", content: "I've analyzed Jane's CV. What would you like to know?" }],
  "3": [{ role: "assistant", content: "I've analyzed Alex's CV. What would you like to know?" }],
}

export function ChatWithCV({ initialCvId = "" }) {
  const [selectedCV, setSelectedCV] = useState<string>(initialCvId)
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load initial chat when CV is selected
  useEffect(() => {
    if (selectedCV) {
      setMessages(mockInitialChats[selectedCV] || [])
    } else {
      setMessages([])
    }
  }, [selectedCV])

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || !selectedCV) return

    const userMessage = { role: "user" as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Simulate AI response delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock AI response based on user input
      let aiResponse = "I'm analyzing the CV to answer your question."

      if (input.toLowerCase().includes("experience")) {
        aiResponse = "Based on the CV, they have 5 years of experience in software development."
      } else if (input.toLowerCase().includes("education")) {
        aiResponse = "They have a Bachelor's degree in Computer Science from a top university."
      } else if (input.toLowerCase().includes("skills")) {
        aiResponse = "Their key skills include JavaScript, React, Node.js, and Python."
      }

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }])
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error while processing your request.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare size={20} />
          Chat with CV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select value={selectedCV} onValueChange={setSelectedCV}>
            <SelectTrigger>
              <SelectValue placeholder="Select a CV" />
            </SelectTrigger>
            <SelectContent>
              {mockCVs.map((cv) => (
                <SelectItem key={cv.id} value={cv.id}>
                  {cv.filename} ({cv.user})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCV && (
            <>
              <div className="border rounded-md p-4 h-[300px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                    <p>Select a CV and start chatting</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.role === "user" ? (
                              <>
                                <span className="font-medium">You</span>
                                <User size={14} />
                              </>
                            ) : (
                              <>
                                <span className="font-medium">AI Assistant</span>
                                <MessageSquare size={14} />
                              </>
                            )}
                          </div>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about this CV..."
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send size={18} />
                </Button>
              </form>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
