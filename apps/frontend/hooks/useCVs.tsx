import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CV {
  realId: string;
  indexId: number;
  name: string;
  email: string;
  uploadDate: string;
  fileName: string;
}

interface CVStatus {
  type: "success" | "error" | null;
  message: string;
}

export function useCVs(refreshKey: number) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [status, setStatus] = useState<CVStatus>({ type: null, message: "" });
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  const fetchCvs = async () => {
    if (!token) {
      setStatus({ type: "error", message: "Please log in to view CVs" });
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      setCvs(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching CVs:", error);
      setStatus({ type: "error", message: error.message || "Failed to load CVs. Please try again." });
    }
  };

  useEffect(() => {
    if (token) {
      fetchCvs();
    } else if (token === null) {
      // Wait for token to be set
    } else {
      setStatus({ type: "error", message: "Please log in to view CVs" });
    }
  }, [token, refreshKey]);

  const handleDelete = async (cvId: string) => {
    if (!token) {
      setStatus({ type: "error", message: "Please log in to delete a CV" });
      return;
    }

    if (!confirm(`Are you sure you want to delete CV ${cvId}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cv/${cvId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("CV not found");
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          router.push("/");
          throw new Error("You are not authorized to delete this CV");
        } else {
          throw new Error("Failed to delete CV");
        }
      }

      await fetchCvs();
      setStatus({ type: "success", message: `CV ${cvId} deleted successfully` });
      setTimeout(() => setStatus({ type: null, message: "" }), 5000);
    } catch (error: any) {
      console.error("Error deleting CV:", error);
      setStatus({
        type: "error",
        message: error.message || "Failed to delete CV. Please try again.",
      });
    }
  };

  return { cvs, status, handleDelete };
}