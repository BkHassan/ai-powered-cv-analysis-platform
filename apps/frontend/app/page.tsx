"use client"

import { useState } from "react"
import Image from "next/image"
import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <main className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden w-1/2 p-8 bg-muted/20 md:flex items-center justify-center">
        <div className="relative w-full h-full max-w-md max-h-md rounded-xl overflow-hidden">
          <Image
            src="/robot.image.jpg?height=600&width=600"
            alt="Authentication"
            fill
            className="object-cover rounded-xl"
            priority
          />
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{isLogin ? "Welcome back" : "Create an account"}</h1>
            <p className="mt-2 text-muted-foreground">
              {isLogin ? "Enter your credentials to access your account" : "Fill in your information to get started"}
            </p>
          </div>

          {isLogin ? <LoginForm /> : <SignupForm />}

          <div className="text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
