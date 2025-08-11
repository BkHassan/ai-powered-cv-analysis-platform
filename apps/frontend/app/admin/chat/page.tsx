"use client";

import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ChatWithCV } from "@/components/chat-with-cv";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Home, ChevronRight } from "lucide-react";
import Link from "next/link";

function ChatContent() {
  const searchParams = useSearchParams();
  const cvId = searchParams.get("cvId") || "";
  const fileName = searchParams.get("fileName") || cvId;
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto pt-24 pb-10 mt-8 px-4">
        <div className="flex items-center text-sm text-gray-700 mb-4">
          <Home className="w-5 h-5 mr-2" />
          <Link
            href="/admin"
            className="flex items-center hover:text-purple-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="font-semibold">Chat with CV</span>
          </Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <ChatWithCV initialFileName={fileName} />
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-pink-100">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
