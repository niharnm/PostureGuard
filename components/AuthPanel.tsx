"use client";

import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

type AuthMode = "login" | "signup";

export function AuthPanel() {
  const { data: session, status } = useSession();
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void getProviders().then((providers) => {
      if (!active) return;
      setGoogleEnabled(Boolean(providers?.google));
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
      if (mode === "signup") {
        const signup = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name })
        });

        if (!signup.ok) {
          const data = await signup.json().catch(() => ({}));
          throw new Error(data.error || "Unable to create account.");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        throw new Error("Invalid credentials.");
      }

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
          minLength={6}
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
        <button
          onClick={() => signIn("google")}
          disabled={!googleEnabled}
          className="rounded-xl border border-slate-600/50 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue with Google
        </button>
        <p className="text-xs text-slate-400">
          {googleEnabled
            ? "Google OAuth is available."
            : "Google OAuth is unavailable. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."}
        </p>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
