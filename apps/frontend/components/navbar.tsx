"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface NavLinksProps {
  userRole: string | null;
  mobile?: boolean;
  onClick?: () => void;
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.role || "user");
      } catch (error) {
        console.error("Error decoding token:", error);
        setUserRole("user");
      }
    }
  }, []);

  return (
    <nav className="bg-white/30 backdrop-blur-md text-gray-900 p-4 fixed top-0 left-0 right-0 z-10 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link
          href="/admin"
          className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity 
             bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent"
        >
          MindCraft
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6 items-center">
          <NavLinks userRole={userRole} />
        </div>

        {/* Mobile Navigation Toggle */}
        <button
          className="md:hidden text-gray-900"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/90 backdrop-blur-md py-4 px-6 space-y-4 shadow-md">
          <NavLinks
            userRole={userRole}
            mobile
            onClick={() => setIsMenuOpen(false)}
          />
        </div>
      )}
    </nav>
  );
}

function NavLinks({
  userRole,
  mobile = false,
  onClick = () => {},
}: NavLinksProps) {
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Home" },
    ...(userRole === "admin"
      ? [{ href: "/admin/users", label: "Admin" }]
      : [{ href: "/admin/upload", label: "Upload" }]),
    { href: "/admin/chat", label: "Chat" },
    { href: "/admin/cvs", label: "Profils" },
  ];

  return (
    <>
      {links.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/admin" && pathname?.startsWith(link.href));

        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontWeight: isActive ? "700" : "500",
              color: isActive ? "#7e22ce" : "inherit",
            }}
            className={`hover:text-purple-600 transition-colors ${
              mobile ? "block py-2 text-lg" : "text-sm"
            }`}
            onClick={onClick}
          >
            {link.label}
          </Link>
        );
      })}
      <span
        onClick={() => {
          localStorage.removeItem("token");
          router.push("/");
          onClick();
        }}
        className={`cursor-pointer hover:text-purple-600 transition-colors ${
          mobile ? "block py-2 text-lg" : "text-sm font-medium"
        }`}
      >
        Logout
      </span>
    </>
  );
}
