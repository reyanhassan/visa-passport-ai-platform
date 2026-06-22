"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/shared/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiErrorMessage, apiRequest } from "@/lib/api";

function registrationErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
    return "Check your name and email, and use a password with at least 8 characters.";
  }
  return apiErrorMessage(error, "Unable to create your account. Please try again.");
}

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acceptedTerms) return setError("Please accept the Terms and Privacy Policy");
    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName: `${firstName} ${lastName}`.trim(), email, password }),
      });
      router.push("/login");
    } catch (requestError) {
      setError(registrationErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return <AuthShell eyebrow="Get started free" title="Create your VisaFlow workspace" description="Your first two passport scans are on us. No card required." footer={<p>Already have an account? <Link href="/login">Sign in</Link></p>}>
    <form className="auth-form" onSubmit={submit} aria-busy={isSubmitting}>{error && <div className="auth-error" role="alert" aria-live="polite">{error}</div>}<div className="form-row"><label>First name<Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Alex" autoComplete="given-name" required disabled={isSubmitting} /></label><label>Last name<Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Morgan" autoComplete="family-name" required disabled={isSubmitting} /></label></div><label>Email address<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={isSubmitting} /></label><label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required disabled={isSubmitting} /></label><label className="checkbox-label"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={isSubmitting} /> <span>I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</span></label><Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Creating workspace…" : "Create free workspace"}</Button></form>
    <div className="form-assurance"><span>✓ No credit card</span><span>✓ Cancel anytime</span><span>✓ Secure by default</span></div>
  </AuthShell>;
}
