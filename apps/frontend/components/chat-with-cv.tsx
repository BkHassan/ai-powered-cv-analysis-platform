"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, User } from "lucide-react";

interface CV {
  realId: string;
  name: string;
  email: string;
  fileName: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWithCVProps {
  initialCvId?: string;
  showInstructions?: boolean;
}

export function ChatWithCV({
  initialCvId = "",
  showInstructions = false,
}: ChatWithCVProps) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<string>(initialCvId);
  const [messages, setMessages] = useState<Message[]>(
    initialCvId ? [{ role: "assistant", content: "How can I help you" }] : []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showInstructions) return;

    const fetchCvs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch CVs");
        const data = await response.json();
        setCvs(data);
        if (initialCvId && data.some((cv: CV) => cv.realId === initialCvId)) {
          setSelectedCV(initialCvId);
          setMessages([{ role: "assistant", content: "How can I help you" }]);
        }
      } catch (error) {
        console.error("Error fetching CVs:", error);
      }
    };
    fetchCvs();
  }, [initialCvId, showInstructions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedCV) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cv/${selectedCV}/chat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: input }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          response.status === 404 ? "CV not found" : "Failed to send message"
        );
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMessage}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl shadow-purple-300/30">
      <CardHeader className="pb-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare size={20} className="font-bold" />
          Getting Started
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          {showInstructions ? (
            <div className="prose prose-sm">
              <p className="mb-8 font-bold text-gray-600 text-base">
                Follow these simple steps to:
              </p>
              <ol className="list-decimal pl-5 space-y-4 font-bold text-gray-600">
                <li>Upload a candidate's CV using the form</li>
                <li>Review the extracted information</li>
                <li>Chat with AI to ask questions about the CV</li>
                <li>Generate a technical quiz based on skills</li>
                <li>Share the quiz link with the candidate</li>
                <li>Review the results when completed</li>
              </ol>
            </div>
          ) : (
            <Select
              value={selectedCV}
              onValueChange={(value) => {
                setSelectedCV(value);
                setMessages([
                  { role: "assistant", content: "How can I help you" },
                ]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a CV" />
              </SelectTrigger>
              <SelectContent>
                {cvs.map((cv) => (
                  <SelectItem key={cv.realId} value={cv.realId}>
                    {cv.fileName} {cv.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedCV ? (
            <>
              <div className="border rounded-md p-4 h-[300px] overflow-y-auto bg-white">
                {messages.length === 0 && !isLoading ? (
                  <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                    <p>Start chatting about the selected CV</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 shadow-md ${
                            message.role === "user"
                              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                              : "bg-purple-50 text-purple-800"
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
                                <span className="font-medium">
                                  AI Assistant
                                </span>
                                <MessageSquare size={14} />
                              </>
                            )}
                          </div>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-purple-50 text-purple-800 shadow-md">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">AI Assistant</span>
                            <MessageSquare size={14} />
                          </div>
                          <div className="flex items-center gap-2 text-2xl text-black">
                            <span className="">●</span>
                            <span className=" delay-200">●</span>
                            <span className=" delay-400">●</span>
                            <div className="text-xs text-center text-purple-400 mt-1">
                              is thinking
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 mt-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about this CV..."
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                >
                  <Send size={18} className="text-white" />
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
