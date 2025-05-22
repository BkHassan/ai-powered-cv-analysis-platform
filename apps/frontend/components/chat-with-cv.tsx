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
import {
  MessageSquare,
  Send,
  User,
  WandSparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { GlobalChatWithCV } from "@/components/global-chat-with-cv";

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
  initialFileName?: string;
  showInstructions?: boolean;
}

export function ChatWithCV({
  initialFileName = "",
  showInstructions = false,
}: ChatWithCVProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<string>(() => {
    const urlFileName = searchParams.get("fileName");
    return (
      urlFileName ||
      (typeof window !== "undefined"
        ? localStorage.getItem("lastSelectedFileName") || initialFileName
        : initialFileName)
    );
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [renderedHtml, setRenderedHtml] = useState<{ [key: number]: string }>(
    {}
  );
  const [userRole, setUserRole] = useState<string>("");

  // Configure marked for better list rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Function to parse and sanitize Markdown
  const renderMessageContent = async (
    content: string,
    role: "user" | "assistant"
  ) => {
    if (role === "assistant") {
      const html = await marked(content);
      return DOMPurify.sanitize(html);
    }
    return content; // User messages remain plain text
  };

  useEffect(() => {
    if (showInstructions) return;

    const fetchCvs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please log in to view CVs");
          return;
        }

        // Fetch user role (assuming /auth/me returns role)
        const userResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserRole(userData.role || "");
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Fetch CVs failed: ${response.status} - ${errorText}`);
          throw new Error(`Failed to fetch CVs: ${errorText}`);
        }
        const data = await response.json();
        console.log("Fetched CVs:", data);
        if (!Array.isArray(data) || data.length === 0) {
          console.warn("No CVs returned from /cv");
          setCvs([]);
          setSelectedCV("");
          toast.warn("No CVs available. Please upload a CV.");
          return;
        }
        setCvs(data);
        const urlFileName = searchParams.get("fileName");
        if (urlFileName && data.some((cv: CV) => cv.fileName === urlFileName)) {
          console.log(`URL fileName ${urlFileName} found in CV list`);
          setSelectedCV(urlFileName);
          localStorage.setItem("lastSelectedFileName", urlFileName);
        } else if (urlFileName && retryCount < 3) {
          console.warn(
            `URL fileName ${urlFileName} not found in CV list, retrying (${
              retryCount + 1
            }/3)`
          );
          setTimeout(() => setRetryCount((prev) => prev + 1), 1000);
        } else {
          console.log(`Setting default CV to ${data[0]?.fileName || ""}`);
          const defaultFileName = data[0]?.fileName || "";
          setSelectedCV(defaultFileName);
          if (defaultFileName) {
            localStorage.setItem("lastSelectedFileName", defaultFileName);
            router.push(
              `/admin/chat?fileName=${encodeURIComponent(defaultFileName)}`,
              { scroll: false }
            );
          }
        }
      } catch (error) {
        console.error("Error fetching CVs:", error);
        toast.error("Failed to load CVs. Please try again.");
        setCvs([]);
        setSelectedCV("");
      }
    };
    fetchCvs();
  }, [initialFileName, showInstructions, searchParams, router, retryCount]);

  useEffect(() => {
    if (!selectedCV || showInstructions) return;

    const controller = new AbortController();
    const fetchChatHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please log in to view chat history");
          return;
        }
        console.log(`Fetching chat history for fileName: ${selectedCV}`);
        setMessages([]);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/cv/${encodeURIComponent(
            selectedCV
          )}/chat-history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Chat history fetch failed: ${response.status} - ${errorText}`
          );
          if (response.status === 404) {
            console.log(`No chat history found for fileName: ${selectedCV}`);
            setMessages([
              { role: "assistant", content: "How can I help you?" },
            ]);
            return;
          } else if (response.status === 403) {
            toast.error("You are not authorized to view this chat history");
            return;
          } else if (response.status === 401) {
            toast.error("Session expired. Please log in again.");
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch chat history: ${errorText}`);
        }
        const data = await response.json();
        console.log("Chat history response:", data);
        const historyMessages: Message[] = data.flatMap(
          (entry: { query: string; response: string }) => [
            { role: "user", content: entry.query },
            { role: "assistant", content: entry.response },
          ]
        );
        setMessages([
          { role: "assistant", content: "How can I help you?" },
          ...historyMessages,
        ]);
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Error fetching chat history:", error);
        toast.error("Failed to load chat history. Please try again.");
        setMessages([{ role: "assistant", content: "How can I help you?" }]);
      }
    };
    fetchChatHistory();
    return () => controller.abort();
  }, [selectedCV, showInstructions, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const renderMessages = async () => {
      const newRenderedHtml: { [key: number]: string } = {};
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === "assistant") {
          newRenderedHtml[i] = await renderMessageContent(
            messages[i].content,
            messages[i].role
          );
        }
      }
      setRenderedHtml(newRenderedHtml);
    };
    void renderMessages();
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
      if (!token) {
        toast.error("Please log in to send messages");
        setMessages((prev) => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cv/${encodeURIComponent(
          selectedCV
        )}/chat`,
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
        console.error(`Send message failed: ${response.status} - ${text}`);
        throw new Error(
          response.status === 404 ? "CV not found" : "Failed to send message"
        );
      }

      const data = await response.json();
      console.log("Send message response:", data);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Error sending message:", errorMessage);
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
      <CardHeader className="pb-0 flex flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare size={20} className="font-bold" />
          Chat with CV
        </CardTitle>
        {!showInstructions && selectedCV && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 via-pink-500 to-fuchsia-500 hover:opacity-90 text-white"
            asChild
            aria-label="Generate quiz for selected CV"
          >
            <Link href={`/admin/quiz/${encodeURIComponent(selectedCV)}`}>
              <WandSparkles className="h-4 w-4 mr-1" />
              Generate Quiz
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          {showInstructions ? (
            <div className="prose prose-sm">
              <p className="mb-8 font-bold text-gray-600 text-base">
                Follow these simple steps to:
              </p>
              <ol className="list-decimal pl-5 space-y-6 font-semibold text-gray-600">
                <li>Upload a candidate's CV using the form</li>
                <li>Review the extracted information</li>
                <li>Chat with AI to ask questions about the CV</li>
                <li>Generate a technical quiz based on skills</li>
                <li>Share the quiz link with the candidate</li>
                <li>Review the results when completed</li>
              </ol>
            </div>
          ) : (
            <>
              <Select
                value={selectedCV}
                onValueChange={(value) => {
                  console.log(`Selecting CV with fileName: ${value}`);
                  setSelectedCV(value);
                  localStorage.setItem("lastSelectedFileName", value);
                  router.push(
                    `/admin/chat?fileName=${encodeURIComponent(value)}`,
                    { scroll: false }
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a CV" />
                </SelectTrigger>
                <SelectContent>
                  {userRole === "admin" && (
                    <SelectItem value="global">All CVs</SelectItem>
                  )}
                  {cvs.map((cv) => (
                    <SelectItem key={cv.fileName} value={cv.fileName}>
                      {cv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCV === "global" ? (
                <GlobalChatWithCV />
              ) : (
                selectedCV && (
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
                                {message.role === "user" ? (
                                  <p>{message.content}</p>
                                ) : (
                                  <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                      __html:
                                        renderedHtml[index] || message.content,
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
                                  <span className="font-medium">
                                    AI Assistant
                                  </span>
                                  <MessageSquare size={14} />
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="flex items-center gap-2 text-2xl">
                                    <span className="text-purple-600 animate-bounce inline-block">
                                      ●
                                    </span>
                                    <span className="text-purple-600 animate-bounce inline-block delay-150">
                                      ●
                                    </span>
                                    <span className="text-purple-600 animate-bounce inline-block delay-300">
                                      ●
                                    </span>
                                  </div>
                                  <div className="text-xs text-center text-purple-400 mt-1">
                                    AI is thinking
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                    <form
                      onSubmit={handleSendMessage}
                      className="flex gap-2 mt-2"
                    >
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
                )
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
