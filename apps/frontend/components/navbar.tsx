"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"


export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  return (
    <nav className="bg-gray-800 text-white p-4 fixed top-0 left-0 right-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          CV Manager
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6">
          <NavLinks />
        </div>

        {/* Mobile Navigation Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800 py-4 px-6 space-y-4">
          <NavLinks mobile onClick={() => setIsMenuOpen(false)} />
        </div>
      )}
    </nav>
  )
}

function NavLinks({ mobile = false, onClick = () => {} }) {
  const router = useRouter()

  
  const links = [
    { href: "/admin", label: "Home" },
    { href: "/admin/upload", label: "Upload CV" },
    { href: "/admin/chat", label: "Chat" },
    { href: "/admin/cvs", label: "List CVs" },
  ]

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`hover:text-gray-300 ${mobile ? "block py-2" : ""}`}
          onClick={onClick}
        >
          {link.label}
        </Link>
      ))}
      <Button variant="outline" size="sm" className="text-white border-white hover:bg-gray-700"
      onClick={() => router.push("/")}
      >
        Logout
      </Button>
    </>
  )
}
