import { Navbar } from "@/components/navbar";
import { CVList } from "@/components/cv-list";

export default function CVListPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto pt-24 pb-10 px-4">

        <CVList />
      </main>
    </div>
  );
}