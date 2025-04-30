"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function ChatWithCV({ initialCvId = "" }) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<string>(initialCvId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch CV list
  useEffect(() => {
    const fetchCvs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:3003/cv", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch CVs");
        const data = await response.json();
        console.log("fetched CVs:", data);
        setCvs(data);
        if (initialCvId && data.some((cv: CV) => cv.realId === initialCvId)) {
          setSelectedCV(initialCvId);
          setMessages([{ role: "assistant", content: 'How can i help you' }]);
        }
      } catch (error) {
        console.error("Error fetching CVs:", error);
      }
    };
    fetchCvs();
  }, [initialCvId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedCV) return;
    console.log("Selected CV ID:", selectedCV);

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3003/cv/${selectedCV}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Response error:", response.status, text);
        throw new Error(response.status === 404 ? "CV not found" : "Failed to send message");
      }

      const data = await response.json();
      console.log("CHatbot response:", data);

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage = " An unknown error occured.";
      if (error instanceof Error){
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare size={20} />
          Chat with CV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select value={selectedCV} onValueChange={(value) => {
            console.log("User selected CV:", value);
            setSelectedCV(value);
            setMessages([{ role: "assistant", content: 'How can i help you'}]);
          }}>
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
  );
}