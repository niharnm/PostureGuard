"use client";

import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban } from "lucide-react";

type AuthMode = "login" | "signup";

export function AuthPanel() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (!authError) return;

    switch (authError) {
      case "AccessDenied":
        setError(
          "Google sign-in is blocked by the Google OAuth app configuration. Set the consent screen to External and add your account as a test user, or publish the app."
        );
        break;
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
        setError("Google sign-in is misconfigured. Verify the Google client ID, client secret, and callback URL.");
        break;
      default:
        setError("Google sign-in failed. Check the OAuth configuration and try again.");
        break;
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void getProviders().then((providers) => {
      if (!active) return;
      setGoogleEnabled(Boolean(providers?.google));
    }).catch((error) => {
      console.error("Failed to load auth providers:", error);
      if (!active) return;
      setGoogleEnabled(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (mode === "signup") {
        const signup = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password, name: trimmedName })
        });

        const data = await signup.json().catch(() => null);
        if (!signup.ok) {
          const message =
            typeof data?.error === "string" && data.error.trim()
              ? data.error
              : `Unable to create account. (HTTP ${signup.status})`;
          throw new Error(message);
        }
      }

      const result = await signIn("credentials", {
        email: trimmedEmail,
        password,
        redirect: false
      });

      if (!result) {
        throw new Error("Login is temporarily unavailable.");
      }

      if (result.error) {
        if (mode === "signup") {
          throw new Error("Account created, but sign-in failed. Please log in with your new credentials.");
        }

        throw new Error("Invalid email or password.");
      }

      if (!result.ok) {
        throw new Error(mode === "signup" ? "Account created, but sign-in failed." : "Login is temporarily unavailable.");
      }

      setEmail(trimmedEmail);
      setName("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "authenticated" && session?.user) {
    return (
      <section className="panel rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Logged In</p>
            <p className="text-lg font-semibold text-white">{session.user.name ?? session.user.email}</p>
            <p className="text-sm text-slate-400">{session.user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-xl border border-slate-500/40 bg-slate-900/50 px-4 py-2 text-sm text-slate-100"
          >
            Log Out
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="auth-panel" className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">User Login</h2>
        <div className="rounded-full border border-slate-700/60 bg-slate-900/50 p-1 text-xs">
          <button
            onClick={() => setMode("login")}
            className={`rounded-full px-3 py-1 ${mode === "login" ? "bg-cyan-300/20 text-cyan-100" : "text-slate-400"}`}
          >
            Log In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-full px-3 py-1 ${mode === "signup" ? "bg-cyan-300/20 text-cyan-100" : "text-slate-400"}`}
          >
            Sign Up
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
        {mode === "signup" ? (
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required={mode === "signup"}
            className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
            placeholder="Name"
          />
        ) : null}
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
          placeholder="Email"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
          placeholder="Password"
        />
        <button
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-accent to-mint px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Log In"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            disabled={!googleEnabled}
            aria-disabled={!googleEnabled}
            className="rounded-xl border border-slate-600/50 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue with Google
          </button>
          {!googleEnabled ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-rose-300/90">
              <Ban className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate-400">
            {googleEnabled ? "Google OAuth is available." : "Currently down — will be up later"}
          </p>
          {!googleEnabled ? (
            <span className="w-fit rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-rose-200">
              Temporarily unavailable
            </span>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
