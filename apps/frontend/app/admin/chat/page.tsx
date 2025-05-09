"use client"

import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { ChatWithCV } from "@/components/chat-with-cv"

export default function ChatPage() {
  const searchParams = useSearchParams()
  const cvId = searchParams.get("cvId") || ""

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto pt-24 pb-10 px-4">
        <h1 className="text-3xl font-bold mb-8">Chat with CV</h1>

        <div className="max-w-3xl mx-auto">
          <ChatWithCV initialFileName={cvId} />
        </div>
      </main>
    </div>
  )
}
