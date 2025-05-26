"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";

function AuthContent({
  isLogin,
  setIsLogin,
}: {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
}) {
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
            <h1 className="text-3xl font-bold">
              {isLogin ? "Welcome back" : "Create an account"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isLogin
                ? "Enter your credentials to access your account"
                : "Fill in your information to get started"}
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[300px]">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          >
            {isLogin ? (
              <LoginForm onUserNotFound={() => setIsLogin(false)} />
            ) : (
              <SignupForm onSignupSuccess={() => setIsLogin(true)} />
            )}
          </Suspense>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return <AuthContent isLogin={isLogin} setIsLogin={setIsLogin} />;
}
