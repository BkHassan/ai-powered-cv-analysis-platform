"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react"
import { ToastContainer, toast } from "react-toastify"
import 'react-toastify/dist/ReactToastify.css'

export function LoginForm({ onUserNotFound }: { onUserNotFound: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    const formData = {
      email: (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value,
      password: (e.currentTarget.elements.namedItem("password") as HTMLInputElement).value,
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const errorData = await response.json()

      if (!response.ok) {
        if (response.status === 404 || errorData.message === "User not found") {
          const msg = "No account found with this email. Would you like to sign up?"
          setErrorMessage(msg)
          toast.error(msg)
          return
        }

        if (response.status === 401 || errorData.message === "Invalid password") {
          const msg = "Incorrect password. Please try again."
          setErrorMessage(msg)
          toast.error(msg)
          return
        }

        const msg = errorData.message || "Login failed. Please check your credentials."
        setErrorMessage(msg)
        toast.error(msg)
        return
      }

      // success
      const data = errorData
      toast.success("Login successful!")
      localStorage.setItem("token", data.accessToken)
      window.location.href = "/admin"

    } catch (error) {
      console.error("Error:", error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="name@example.com" required autoComplete="email" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeIcon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="text-sm text-red-600">
            {errorMessage}{" "}
            {errorMessage.includes("No account") && (
              <button
                type="button"
                onClick={onUserNotFound}
                className="ml-2 underline text-blue-600 hover:text-blue-800"
              >
                Sign up
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button type="button" className="text-sm text-primary hover:underline">
            Forgot password?
          </button>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </>
  )
}
