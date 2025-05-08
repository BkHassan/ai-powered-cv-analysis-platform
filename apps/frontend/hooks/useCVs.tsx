import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface CV {
  realId: string;
  indexId: number;
  name: string;
  email: string;
  uploadDate: string;
  fileName: string;
  quizStatus: "not_generated" | "generated" | "completed";
  quizScore?: number;
}

interface Status {
  type: "success" | "error" | null;
  message: string;
}

export function useCVs(refreshKey: number) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [status, setStatus] = useState<Status>({ type: null, message: "" });
  const router = useRouter();

  useEffect(() => {
    const fetchCVs = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setStatus({ type: "error", message: "Please log in to view CVs" });
        router.push("/");
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            router.push("/");
            throw new Error("Session expired. Please log in again.");
          }
          throw new Error("Failed to fetch CVs");
        }

        const data = await response.json();
        // Fetch quiz results for completed quizzes
        const enrichedCvs = await Promise.all(
          data.map(async (cv: CV) => {
            if (cv.quizStatus === "completed") {
              try {
                const quizResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/quiz/results?fileName=${encodeURIComponent(cv.fileName)}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                if (quizResponse.ok) {
                  const quizData = await quizResponse.json();
                  return { ...cv, quizScore: quizData.score };
                }
              } catch (err) {
                console.error(`Error fetching quiz results for ${cv.fileName}:`, err);
              }
            }
            return cv;
          })
        );

        setCvs(enrichedCvs);
        setStatus({ type: null, message: "" });
      } catch (err: any) {
        setStatus({ type: "error", message: err.message || "Failed to load CVs" });
      }
    };

    fetchCVs();
  }, [refreshKey, router]);

  const handleDelete = async (cvId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus({ type: "error", message: "Please log in to delete CV" });
      router.push("/");
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv/${cvId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete CV");
      }

      setCvs((prev) => prev.filter((cv) => cv.realId !== cvId));
      toast.success("CV deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete CV");
    }
  };

  return { cvs, status, handleDelete };
}