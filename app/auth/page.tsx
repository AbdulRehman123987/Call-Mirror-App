"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type AuthMode = "signin" | "signup" | "reset";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode") as AuthMode | null;

  const [mode, setMode] = useState<AuthMode>("signin");

  useEffect(() => {
    if (modeParam === "signup" || modeParam === "reset") {
      setMode(modeParam);
    } else {
      setMode("signin");
    }
  }, [modeParam]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {mode === "signin" && (
            <SignInForm
              onToggleMode={() => setMode("signup")}
              onForgotPassword={() => setMode("reset")}
            />
          )}
          {mode === "signup" && (
            <SignUpForm onToggleMode={() => setMode("signin")} />
          )}
          {mode === "reset" && (
            <ResetPasswordForm onBack={() => setMode("signin")} />
          )}
        </div>
      </div>
    </div>
  );
}
