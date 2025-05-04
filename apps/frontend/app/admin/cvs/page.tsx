import { Navbar } from "@/components/navbar";
import { CVList } from "@/components/cv-list";

export default function CVListPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto pt-24 pb-10 px-4">
        <h1 className="text-3xl font-bold mb-8">CV List</h1>

        <CVList />
      </main>
    </div>
  );
}