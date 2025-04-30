"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";
import zxcvbn from "zxcvbn";

type SignupFormProps = {
  onSignupSuccess: () => void;
};

export function SignupForm({ onSignupSuccess }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const evaluatePasswordStrength = (password: string) => {
    const result = zxcvbn(password);
    setPasswordStrength(result.score);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = {
      firstName: (
        e.currentTarget.elements.namedItem("first-name") as HTMLInputElement
      ).value,
      lastName: (
        e.currentTarget.elements.namedItem("last-name") as HTMLInputElement
      ).value,
      email: (e.currentTarget.elements.namedItem("email") as HTMLInputElement)
        .value,
      password: (
        e.currentTarget.elements.namedItem("password") as HTMLInputElement
      ).value,
    };

        // Client-side validation
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          setErrorMessage("First name and last name cannot be empty");
          setIsLoading(false);
          return;
        }
        if (!formData.email.includes("@")) {
          setErrorMessage("Please enter a valid email address");
          setIsLoading(false);
          return;
        }
        if (passwordStrength !== null && passwordStrength < 2) {
          setErrorMessage("Password is too weak. Please use a stronger password.");
          setIsLoading(false);
          return;
        }

    try {
      const response = await fetch("http://localhost:3003/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.message || "Signup failed";
        throw new Error("Signup failed");
      }

      const data = await response.json();
      console.log("Signup success:", data);
      // maybe redirect or show success
      setSuccessMessage("Account created successfully! Redirecting...");
      setTimeout(() => {
        onSignupSuccess(); 
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === null) return "";
    switch (passwordStrength) {
      case 0:
        return "Very Weak";
      case 1:
        return "Weak";
      case 2:
        return "Medium";
      case 3:
        return "Strong";
      case 4:
        return "Very Strong";
      default:
        return "";
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength === null) return "";
    switch (passwordStrength) {
      case 0:
      case 1:
        return "text-red-500"; // Weak
      case 2:
        return "text-yellow-500"; // Medium
      case 3:
      case 4:
        return "text-green-500"; // Strong
      default:
        return "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            placeholder="John"
            required
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            placeholder="Doe"
            required
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
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
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              evaluatePasswordStrength(e.target.value);
            }}
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

        {password && (
          <div className="mt-1 space-y-1">
            <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-300 ${
                  passwordStrength === 0
                    ? "bg-red-500 w-1/5"
                    : passwordStrength === 1
                    ? "bg-red-500 w-2/5"
                    : passwordStrength === 2
                    ? "bg-yellow-500 w-3/5"
                    : passwordStrength === 3
                    ? "bg-green-500 w-4/5"
                    : passwordStrength === 4
                    ? "bg-green-600 w-full"
                    : "w-0"
                }`}
              />
            </div>
            <div className={`mt-2 text-sm ${getStrengthColor()}`}>
              {getPasswordStrengthLabel()}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="terms" required />
        <Label htmlFor="terms" className="text-sm font-normal">
          I agree to the{" "}
          <a href="#" className="text-primary hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Sign up"
        )}
      </Button>
    </form>
  );
}
