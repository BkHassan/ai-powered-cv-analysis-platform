'use client'

import { Navbar } from "@/components/navbar"
import { UploadCV } from "@/components/upload-cv"
import { ChatWithCV } from "@/components/chat-with-cv"
import { CVList } from "@/components/cv-list"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    //example: check if token exist in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

    if (isCheckingAuth)  {
      return <div>Loading...</div>;
    }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto pt-24 pb-10 px-4">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid gap-8">
          <section>
            <UploadCV />
          </section>

          <section>
            <ChatWithCV />
          </section>

          <section>
            <CVList />
          </section>
        </div>
      </main>
    </div>
  )
}
