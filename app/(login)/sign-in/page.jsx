"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SVGLogo from "@/components/svg-logo";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  const supabase = createClient();
  const router = useRouter();
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      if (process.env.DISABLE_OTP === "true") {
      }
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (data?.user) {
        // Show OTP input instead of redirecting immediately
        setPendingUserId(data.user.id);
        setShowOtp(true);
      } else {
        setError("Login failed: no user returned.");
      }
    } catch (err) {
      setError("Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    console.log("Login with Google");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 transition-colors">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <SVGLogo />
        </div>

        <h1 className="mt-10 text-2xl font-semibold text-center text-gray-900 dark:text-white transition-colors">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300 transition-colors">
          Sign in to your IT Auditing account
        </p>

        {!showOtp ? (
          <form key="login" onSubmit={handleLogin} className="mt-10 space-y-6">
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="px-4 h-12 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg border-gray-200 dark:border-slate-600 shadow-sm transition-all focus:border-blue-500 focus:ring-blue-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
            />
            <Input
              name="password"
              type="password"
              placeholder="Your password"
              required
              className="px-4 h-12 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg border-gray-200 dark:border-slate-600 shadow-sm transition-all focus:border-blue-500 focus:ring-blue-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
            />

            <Button
              type="submit"
              className="w-full h-12 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        ) : (
          <form
            key="otp"
            onSubmit={async (e) => {
              e.preventDefault();
            }}
            className="mt-10 space-y-6"
          >
            <p className="text-sm text-center text-gray-600">
              Enter the OTP from your mobile app
            </p>
            <Input
              name="otp"
              type="text"
              placeholder="123456"
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value)}
              required
              className="px-4 h-12 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg border-gray-200 dark:border-slate-600 shadow-sm transition-all focus:border-blue-500 focus:ring-blue-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400"
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={async () => {
                  if (!otpValue || !pendingUserId)
                    return setError("Missing OTP or user");
                  setOtpLoading(true);
                  setError("");
                  try {
                    const res = await fetch("/api/auth/verify-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user_id: pendingUserId,
                        otp: otpValue,
                      }),
                    });
                    const result = await res.json();
                    if (!res.ok || !result.success) {
                      setError(result.message || "OTP verification failed");
                      return;
                    }
                    // OTP verified — determine role and redirect accordingly
                    try {
                      // fetch profile role
                      const profileRes = await fetch(
                        `/api/profiles/${pendingUserId}`
                      );
                      const profileJson = await profileRes.json();
                      const role = profileJson?.role;
                      if (role === "auditee") {
                        router.push("/auditee/dashboard");
                      } else {
                        router.push("/dashboard");
                      }
                    } catch (err) {
                      console.error("Error fetching profile role:", err);
                      router.push("/dashboard");
                    }
                  } catch (err) {
                    console.error(err);
                    setError("OTP verification failed");
                  } finally {
                    setOtpLoading(false);
                  }
                }}
                className="flex-1 h-12 font-medium text-white bg-blue-600 rounded-lg"
              >
                {otpLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Verify OTP"
                )}
              </Button>

              <Button
                type="button"
                onClick={() => {
                  // Allow user to go back to login
                  setShowOtp(false);
                  setPendingUserId(null);
                  setOtpValue("");
                  setError("");
                }}
                className="h-12 font-medium text-gray-700 bg-white rounded-lg border border-gray-200"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="relative mt-6">
          <div className="flex absolute inset-0 items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="flex justify-center relative">
            <span className="px-4 text-sm text-gray-500 bg-gradient-to-b from-white to-gray-50">
              or
            </span>
          </div>
        </div>

        <Button
          onClick={handleGoogleSignIn}
          className="mt-6 w-full h-12 font-medium text-gray-700 bg-white rounded-lg border border-gray-200 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <div className="flex items-center justify-center">
              <svg className="mr-2 w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25..." />
                <path fill="#34A853" d="M12 23..." />
                <path fill="#FBBC05" d="M5.84 14.09..." />
                <path fill="#EA4335" d="M12 5.38..." />
              </svg>
              Continue with Google
            </div>
          )}
        </Button>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        <p className="mt-8 text-sm text-center text-gray-600">
          Don’t have an account?{" "}
          <a
            href="/sign-up"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
