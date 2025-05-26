"use client";

import { Navbar } from "@/components/navbar";
import { CVList } from "@/components/cv-list";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CVListPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="container mx-auto pt-24 pb-10 px-4">
          <CVList />
        </main>
      </div>
    </div>
  );
}
