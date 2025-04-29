import { Navbar } from "@/components/navbar"
import { UploadCV } from "@/components/upload-cv"

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto pt-24 pb-10 px-4">
        <h1 className="text-3xl font-bold mb-8">Upload CV</h1>

        <div className="max-w-2xl mx-auto">
          <UploadCV />
        </div>
      </main>
    </div>
  )
}