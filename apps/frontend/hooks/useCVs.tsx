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
}

interface Status {
  type: "success" | "error" | null;
  message: string;
}

export function useCVs(refreshKey: number) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [status, setStatus] = useState<Status>({ type: null, message: "" });
  const router = useRouter();

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
      setCvs(data);
      setStatus({ type: null, message: "" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to load CVs" });
    }
  };

  useEffect(() => {
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

  return { cvs, status, handleDelete, fetchCVs }; // Expose fetchCVs for manual refresh
}