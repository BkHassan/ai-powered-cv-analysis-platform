"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ForgotPasswordForm } from "./forgot-password-form";
import { useSearchParams } from "next/navigation";

export function LoginForm({ onUserNotFound }: { onUserNotFound: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for email in URL parameters
    const emailParam = searchParams.get("email");
    const fromReset = searchParams.get("fromReset");
    const fromSignup = searchParams.get("fromSignup")

    if (emailParam && (fromReset === "true" || fromSignup === "true")) {
      setEmail(emailParam);

      if (fromSignup === "true") {
        toast.success("Account created successfully! Please log in.");
    }
  }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Skip validation if we're auto-submitting from password reset
    const isAutoSubmit =
      localStorage.getItem("resetCredentials") === null && email && password;
    if (!isAutoSubmit) {
      // Basic validation
      if (!email || !email.includes("@")) {
        setErrorMessage("Please enter a valid email address");
        toast.error("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      if (!password || password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long");
        toast.error("Password must be at least 6 characters long");
        setIsLoading(false);
        return;
      }
    }

    const formData = {
      email,
      password,
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const errorData = await response.json();

      if (!response.ok) {
        if (response.status === 404 || errorData.message === "User not found") {
          const msg =
            "No account found with this email. Would you like to sign up?";
          setErrorMessage(msg);
          toast.error(msg);
          // Redirect to signup with email parameter
          const params = new URLSearchParams({
            email: email,
          });
          window.location.href = `/signup?${params.toString()}`;
          return;
        }

        if (
          response.status === 401 &&
          errorData.message.includes("Email not verified")
        ) {
          const msg =
            "Please verify your email with the OTP sent to your inbox.";
          setErrorMessage(msg);
          toast.error(msg);
          return;
        }

        if (
          response.status === 401 ||
          errorData.message === "Incorrect password"
        ) {
          const msg = "Incorrect password. Please try again.";
          setErrorMessage(msg);
          toast.error(msg);
          return;
        }

        const msg =
          errorData.message || "Login failed. Please check your credentials.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // Success
      const data = errorData;
      toast.success("Login successful!");
      localStorage.setItem("token", data.accessToken);
      window.location.href = "/admin";
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Optional: Resend OTP (requires backend endpoint)
  const handleResendOtp = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/resend-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to resend OTP");
      }

      toast.success("OTP resent! Check your email.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend OTP.");
    }
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <>
      <ToastContainer />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              <span className="sr-only">
                {showPassword ? "Hide password" : "Show password"}
              </span>
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
            {errorMessage.includes("verify your email") && (
              <button
                type="button"
                onClick={handleResendOtp}
                className="ml-2 underline text-blue-600 hover:text-blue-800"
              >
                Resend OTP
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setShowForgotPassword(true)}
          >
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
  );
}
