// useCVs.ts
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface CV {
  realId: string;
  indexId: number;
  userIndexId: number; // Added for user-specific index
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
  const [loading, setLoading] = useState(true);

  const fetchCVs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch CVs");
      }

      const data = await response.json();
      setCvs(data);
      setStatus({ type: null, message: "" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to load CVs" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVs();
  }, [refreshKey]);

  const handleDelete = async (cvId: string) => {
    try {
      const token = localStorage.getItem("token");
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

  return { cvs, loading, status, handleDelete, fetchCVs };
}