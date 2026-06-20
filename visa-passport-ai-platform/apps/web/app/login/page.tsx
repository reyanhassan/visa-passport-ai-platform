"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/shared/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiRequest } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <AuthShell eyebrow="Welcome back" title="Sign in to your workspace" description="Continue managing passports and applications securely." footer={<p>New to VisaFlow AI? <Link href="/register">Create an account</Link></p>}>
    <form className="auth-form" onSubmit={submit}>{error && <div className="auth-error" role="alert">{error}</div>}<label>Email address<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={isSubmitting} /></label><label><span>Password <a href="#">Forgot password?</a></span><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required disabled={isSubmitting} /></label><Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in securely"}</Button></form>
  </AuthShell>;
}
