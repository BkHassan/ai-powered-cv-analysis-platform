"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Users } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isEmailVerified: boolean;
  cv_id: string[];
  createdDate: string;
}

export function UserManagementPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please log in to access user management");
          router.push("/login");
          return;
        }

        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.role || "user");

        if (payload.role !== "admin") {
          toast.error("Only admins can access user management");
          router.push("/admin");
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Fetch users failed: ${response.status} - ${errorText}`
          );
          throw new Error(`Failed to fetch users: ${errorText}`);
        }

        const data = await response.json();
        console.log("Fetched users:", data);
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [router]);

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to delete users");
        return;
      }

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/auth/delete?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Delete user failed: ${response.status} - ${errorText}`);
        throw new Error(`Failed to delete user: ${errorText}`);
      }

      setUsers(users.filter((user) => user.email !== email));
      toast.success(`User ${email} deleted successfully`);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user. Please try again.");
    }
  };

  const handleUpdateRole = async (email: string, newRole: "user" | "admin") => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to update user roles");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/update-role`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, role: newRole }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Update role failed: ${response.status} - ${errorText}`);
        throw new Error(`Failed to update role: ${errorText}`);
      }

      setUsers(
        users.map((user) =>
          user.email === email ? { ...user, role: newRole } : user
        )
      );
      toast.success(`User ${email} role updated to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-white">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (userRole !== "admin") {
    return null;
  }

  return (
    <Card className="w-full shadow-xl shadow-purple-300/30">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users size={20} className="font-bold" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center text-muted-foreground h-[300px] flex items-center justify-center">
            <p>No users found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Email Verified</TableHead>
                <TableHead>CVs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    {new Date(user.createdDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{user.isEmailVerified ? "Yes" : "No"}</TableCell>
                  <TableCell>{user.cv_id.length}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteUser(user.email)}
                      className="text-red-600 hover:text-red-800"
                      aria-label={`Delete user ${user.email}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white"
                      onClick={() =>
                        handleUpdateRole(
                          user.email,
                          user.role === "admin" ? "user" : "admin"
                        )
                      }
                      disabled={
                        user.email ===
                          JSON.parse(
                            atob(localStorage.getItem("token")!.split(".")[1])
                          ).email &&
                        users.filter((u) => u.role === "admin").length === 1
                      }
                    >
                      {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
