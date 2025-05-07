import { useRouter } from "next/navigation";

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  router?: ReturnType<typeof useRouter>
): Promise<Response> {
  const token = localStorage.getItem("token");

  if (!token) {
    if (router) {
      localStorage.removeItem("token");
      router.push("/");
    }
    throw new Error("No authentication token found");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    if (router) {
      router.push("/");
    }
    throw new Error("Session expired. Please log in again.");
  }

  return response;
}