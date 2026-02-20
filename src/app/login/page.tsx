"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const { signIn, signInWithGoogle, sendOtp, verifyOtp, setupRecaptcha, isLoading, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Phone OTP state
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Auto-redirect when user signs in via phone
  useEffect(() => {
    if (user && showPhoneLogin) {
      router.push(redirect);
    }
  }, [user, showPhoneLogin, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || "Failed to sign in");
      setLoading(false);
    } else {
      toast.success("Welcome back!");
      router.push(redirect);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  const handleSendOtp = async () => {
    const fullNumber = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
    if (fullNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setPhoneLoading(true);
    try {
      setupRecaptcha("recaptcha-container");
      const { error } = await sendOtp(fullNumber);
      if (error) {
        toast.error(error.message || "Failed to send OTP");
      } else {
        setOtpSent(true);
        toast.success("OTP sent! Check your phone.");
      }
    } catch {
      toast.error("Failed to send OTP. Please try again.");
    }
    setPhoneLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setPhoneLoading(true);
    const { error } = await verifyOtp(otpCode);
    if (error) {
      toast.error(error.message || "Invalid OTP. Please try again.");
    } else {
      toast.success("Welcome back!");
      router.push(redirect);
    }
    setPhoneLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error(
        "Failed to send reset email. Please check your email address.",
      );
    }
    setResetLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
      </div>
    );
  }

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-[#FAFAF5] to-white">
        <Card className="w-full max-w-md border-[#E2E0DA] shadow-soft-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#2D5A27]/10 flex items-center justify-center mb-4">
              <Image
                src="/logo.jpeg"
                alt="Royal Trading"
                width={48}
                height={48}
                className="rounded-full"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-[#2D5A27]">
              Reset Password
            </CardTitle>
            <CardDescription className="text-[#6B7280]">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-[#2D5A27]/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-[#2D5A27]" />
                </div>
                <p className="text-sm text-[#6B7280]">
                  We&apos;ve sent a password reset link to{" "}
                  <strong className="text-[#1A1A1A]">{resetEmail}</strong>. Please check your inbox and
                  follow the instructions.
                </p>
                <Button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail("");
                  }}
                  className="w-full bg-[#2D5A27] hover:bg-[#3B7D34]"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-[#1A1A1A]">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#2D5A27] hover:bg-[#3B7D34]"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex items-center justify-center w-full text-sm text-[#6B7280] hover:text-[#2D5A27] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Login
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phone Login View
  if (showPhoneLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-[#FAFAF5] to-white">
        <Card className="w-full max-w-md border-[#E2E0DA] shadow-soft-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#2D5A27]/10 flex items-center justify-center mb-4">
              <Image
                src="/logo.jpeg"
                alt="Royal Trading"
                width={48}
                height={48}
                className="rounded-full"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-[#2D5A27]">
              Phone Login
            </CardTitle>
            <CardDescription className="text-[#6B7280]">
              {otpSent
                ? "Enter the OTP sent to your phone"
                : "Enter your phone number to receive an OTP"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!otpSent ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-[#1A1A1A]">Phone Number</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280] font-medium">
                      +91
                    </span>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="pl-12 bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendOtp}
                  className="w-full bg-[#2D5A27] hover:bg-[#3B7D34]"
                  disabled={phoneLoading || phoneNumber.length < 10}
                >
                  {phoneLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otpCode" className="text-[#1A1A1A]">OTP Code</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-lg tracking-widest bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
                    maxLength={6}
                    required
                  />
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  className="w-full bg-[#2D5A27] hover:bg-[#3B7D34]"
                  disabled={phoneLoading || otpCode.length !== 6}
                >
                  {phoneLoading ? "Verifying..." : "Verify OTP"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                  }}
                  className="flex items-center justify-center w-full text-sm text-[#6B7280] hover:text-[#2D5A27] transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowPhoneLogin(false);
                setOtpSent(false);
                setPhoneNumber("");
                setOtpCode("");
              }}
              className="flex items-center justify-center w-full text-sm text-[#6B7280] hover:text-[#2D5A27] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </button>
          </CardContent>
        </Card>

        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-[#FAFAF5] to-white">
      <Card className="w-full max-w-md border-[#E2E0DA] shadow-soft-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#2D5A27]/10 flex items-center justify-center mb-4">
            <Image
              src="/logo.jpeg"
              alt="Royal Trading"
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-[#2D5A27]">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-[#6B7280]">
            Sign in to your Royal Trading account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Login Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full border-[#E2E0DA] hover:bg-[#F0EFE8] hover:border-[#2D5A27]/30"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPhoneLogin(true)}
              className="w-full border-[#E2E0DA] hover:bg-[#F0EFE8] hover:border-[#2D5A27]/30"
            >
              <Phone className="h-5 w-5 mr-2" />
              Continue with Phone
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-[#E2E0DA]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[#9CA3AF]">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1A1A1A]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#1A1A1A]">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-[#2D5A27] hover:text-[#3B7D34] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#2D5A27]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#2D5A27] hover:bg-[#3B7D34]"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-[#6B7280]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#2D5A27] hover:text-[#3B7D34] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-[#FAFAF5]">
      <Card className="w-full max-w-md border-[#E2E0DA]">
        <CardHeader className="text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto mt-4" />
          <Skeleton className="h-4 w-64 mx-auto mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
