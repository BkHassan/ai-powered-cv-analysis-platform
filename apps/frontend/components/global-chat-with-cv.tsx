"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, User } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function GlobalChatWithCV() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<{ [key: number]: string }>({});

  // Configure marked for Markdown rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Parse and sanitize Markdown
  const renderMessageContent = async (content: string, role: "user" | "assistant") => {
    if (role === "assistant") {
      const html = await marked(content);
      return DOMPurify.sanitize(html);
    }
    return content;
  };

  // Fetch global chat history
  useEffect(() => {
    const controller = new AbortController();
    const fetchChatHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please log in to view chat history");
          return;
        }
        setMessages([]);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv/global-chat-history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 403) {
            toast.error("Global chat is admin-only");
            return;
          } else if (response.status === 401) {
            toast.error("Session expired. Please log in again.");
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch global chat history: ${errorText}`);
        }
        const data = await response.json();
        const historyMessages: Message[] = data.flatMap(
          (entry: { query: string; response: string }) => [
            { role: "user", content: entry.query },
            { role: "assistant", content: entry.response },
          ]
        );
        setMessages([{ role: "assistant", content: "How can I help you with all CVs?" }, ...historyMessages]);
      } catch (error: any) {
        if (error.name === "AbortError") return;
        toast.error("Failed to load global chat history. Please try again.");
        setMessages([{ role: "assistant", content: "How can I help you with all CVs?" }]);
      }
    };
    fetchChatHistory();
    return () => controller.abort();
  }, [router]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Render Markdown for assistant messages
  useEffect(() => {
    const renderMessages = async () => {
      const newRenderedHtml: { [key: number]: string } = {};
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === "assistant") {
          newRenderedHtml[i] = await renderMessageContent(messages[i].content, messages[i].role);
        }
      }
      setRenderedHtml(newRenderedHtml);
    };
    renderMessages();
  }, [messages]);

  // Send global chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to send messages");
        setMessages((prev) => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv/global-chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(response.status === 403 ? "Global chat is admin-only" : `Failed to send message: ${text}`);
      }
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl shadow-purple-300/30">
      <CardHeader className="pb-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare size={20} className="font-bold" />
          Chat with All CVs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          <div className="border rounded-md p-4 h-[300px] overflow-y-auto bg-white">
            {messages.length === 0 && !isLoading ? (
              <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                <p>Start chatting about all CVs</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
                            <span className="font-medium">AI Assistant</span>
                            <MessageSquare size={14} />
                          </>
                        )}
                      </div>
                      {message.role === "user" ? (
                        <p>{message.content}</p>
                      ) : (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: renderedHtml[index] || message.content,
                          }}
                        />
                      )}
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
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 text-2xl">
                          <span className="text-purple-600 animate-bounce inline-block">●</span>
                          <span className="text-purple-600 animate-bounce inline-block delay-150">●</span>
                          <span className="text-purple-600 animate-bounce inline-block delay-300">●</span>
                        </div>
                        <div className="text-xs text-center text-purple-400 mt-1">AI is thinking</div>
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
              placeholder="Ask about skills or qualifications across all CVs..."
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
        </div>
      </CardContent>
    </Card>
  );
}