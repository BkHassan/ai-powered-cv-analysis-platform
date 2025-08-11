"use client";
import { Navbar } from "@/components/navbar";
import { UploadCV } from "@/components/upload-cv";
import { ChatWithCV } from "@/components/chat-with-cv";
import { CVList } from "@/components/cv-list";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from 'jwt-decode';

export default function AdminDashboard() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
 
  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
 
    if (!token) {
      router.push("/");
      return;
    }
 
    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      const now = Date.now() / 1000;
 
      if (decoded.exp < now) {
        localStorage.removeItem("token");
        router.push("/");
      } else {
        setIsCheckingAuth(false);
      }
    } catch {
      localStorage.removeItem("token");
      router.push("/");
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-8 md:px-12 lg:px-20">
        <h1 className="text-4xl leading-snug font-extrabold text-center mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          Powering Your Hiring Process
        </h1>
        <h3 className="mb-10 text-center text-gray-600 font-bold text-500">
          Welcome back to your dashboard
        </h3>
        <div className="grid gap-6 max-w-6xl mx-auto">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-full">
              <UploadCV onUploadSuccess={handleUploadSuccess} />
            </div>
            <div className="h-full">
              <ChatWithCV showInstructions={true} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}