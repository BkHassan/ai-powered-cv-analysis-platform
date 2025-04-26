import { Navbar } from "@/components/navbar"
import { UploadCV } from "@/components/upload-cv"
import { ChatWithCV } from "@/components/chat-with-cv"
import { CVList } from "@/components/cv-list"

export default function AdminDashboard() {
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
