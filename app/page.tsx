"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Hero } from "@/components/Hero";
import { LiveDashboard } from "@/components/LiveDashboard";
import { SessionInsights } from "@/components/SessionInsights";
import { MetricsExplanation } from "@/components/MetricsExplanation";
import { ArduinoCard } from "@/components/ArduinoCard";
import { Footer } from "@/components/Footer";
import { AuthPanel } from "@/components/AuthPanel";
import { SessionControls } from "@/components/SessionControls";
import { SessionSummaryModal } from "@/components/SessionSummaryModal";
import { SessionHistoryPanel } from "@/components/SessionHistoryPanel";
import { VictorPanel } from "@/components/VictorPanel";
import { usePostureMonitor } from "@/hooks/usePostureMonitor";
import { useArduinoSerial } from "@/hooks/useArduinoSerial";
import { formatDuration } from "@/lib/posture";

function LandingScreen({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-hero-grid bg-[size:22px_22px] p-8 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(54,216,255,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(85,245,181,0.14),transparent_32%)]" />
          <div className="relative max-w-3xl space-y-5">
            <p className="font-[var(--font-jetbrains)] text-xs uppercase tracking-[0.3em] text-accent/80">
              AI + Hardware Posture Coach
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              PostureGuard helps you fix posture in real time with webcam detection and physical feedback.
            </h1>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
              Built for hackathon demos: browser-based posture scoring, instant coaching tips, and optional Arduino
              LED/buzzer alerts when posture degrades.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#auth-panel"
                className="rounded-xl bg-gradient-to-r from-accent to-mint px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                Log In / Sign Up
              </a>
              <button
                onClick={onTryDemo}
                className="rounded-xl border border-cyan-200/25 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-cyan-200/10"
              >
                Try Demo Without Account
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white">What It Does</h2>
            <p className="mt-3 text-sm text-slate-300">
              PostureGuard analyzes your upper-body landmarks from webcam video and classifies posture into GOOD,
              WARN, and BAD states to coach corrections before discomfort accumulates.
            </p>
          </article>
          <article className="panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white">Key Features</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Real-time posture score and trend feedback.</li>
              <li>Actionable coaching tips from posture metrics.</li>
              <li>Calibration and tracked sessions for signed-in users.</li>
            </ul>
          </article>
          <article className="panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white">Posture Detection</h2>
            <p className="mt-3 text-sm text-slate-300">
              MediaPipe pose landmarks are smoothed frame-to-frame, then mapped to posture metrics like forward head,
              shoulder imbalance, head tilt, and torso lean.
            </p>
          </article>
          <article className="panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white">Hardware Integration</h2>
            <p className="mt-3 text-sm text-slate-300">
              The app can send posture states over Web Serial to Arduino, where LEDs and an optional buzzer provide
              immediate physical feedback.
            </p>
          </article>
        </section>

        <section className="panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-white">Demo Mode</h2>
          <p className="mt-2 text-sm text-slate-300">
            Demo mode runs temporary posture detection with no account required. It does not save sessions, track user
            history, or persist calibration data.
          </p>
          <button
            onClick={onTryDemo}
            className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100"
          >
            Launch Demo Mode
          </button>
        </section>

        <AuthPanel />
      </div>
      <Footer />
    </main>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";
  const [demoMode, setDemoMode] = useState(false);

  const monitor = usePostureMonitor({
    isAuthenticated: authenticated,
    userId: session?.user?.id
  });
  const arduino = useArduinoSerial();

  useEffect(() => {
    arduino.sendState(monitor.state);
  }, [arduino.sendState, monitor.state]);

  useEffect(() => {
    if (authenticated) {
      setDemoMode(false);
    }
  }, [authenticated]);

  const inDashboard = useMemo(() => authenticated || demoMode, [authenticated, demoMode]);

  const enterDemoMode = () => {
    setDemoMode(true);
    void monitor.startMonitoring();
  };

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center text-sm text-slate-300">
        Checking session...
      </main>
    );
  }

  if (!inDashboard) {
    return <LandingScreen onTryDemo={enterDemoMode} />;
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Hero onStart={monitor.startMonitoring} />
        {demoMode ? (
          <section className="panel rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Demo Mode</p>
                <p className="text-sm text-slate-200">
                  No login required. Session history and calibration persistence are disabled.
                </p>
              </div>
              <button
                onClick={() => setDemoMode(false)}
                className="rounded-xl border border-slate-600/50 px-4 py-2 text-sm text-slate-200"
              >
                Back to Landing
              </button>
            </div>
          </section>
        ) : null}
        <AuthPanel />
        {authenticated ? (
          <SessionControls
            authenticated={authenticated}
            active={monitor.isSessionActive}
            elapsedLabel={formatDuration(monitor.sessionElapsedMs)}
            onStart={monitor.startSession}
            onEnd={monitor.endSession}
          />
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8"
        >
          <LiveDashboard
            videoRef={monitor.videoRef}
            canvasRef={monitor.canvasRef}
            state={monitor.state}
            score={monitor.score}
            metrics={monitor.metrics}
            tips={monitor.tips}
            cameraReady={monitor.cameraReady}
            modelStatus={monitor.modelStatus}
            error={monitor.error}
            isCalibrating={monitor.isCalibrating}
            calibrationProgress={monitor.calibrationProgress}
            calibrationStatus={monitor.calibrationStatus}
            calibrationMessage={monitor.calibrationMessage}
            trackingStable={monitor.trackingStable}
            trackingConfidence={monitor.trackingConfidence}
            debugData={monitor.debugData}
            onCalibrate={monitor.beginCalibration}
            canCalibrate={authenticated}
          />

          <SessionInsights
            good={monitor.insights.good}
            warn={monitor.insights.warn}
            bad={monitor.insights.bad}
            score={monitor.stats.sessionScore}
            timeline={monitor.timeline}
          />

          {authenticated ? (
            <SessionHistoryPanel sessions={monitor.sessionHistory} />
          ) : (
            <section className="panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Sign In For Full Dashboard</h2>
              <p className="mt-2 text-sm text-slate-300">
                Logged-in users unlock calibration persistence, tracked sessions, and session history.
              </p>
            </section>
          )}

          <VictorPanel context={monitor.victorContext} />

          <MetricsExplanation />

          <ArduinoCard
            supported={arduino.supported}
            status={arduino.status}
            error={arduino.error}
            lastSent={arduino.lastSent}
            onConnect={arduino.connect}
            onDisconnect={arduino.disconnect}
          />
        </motion.div>
      </div>
      <SessionSummaryModal summary={monitor.sessionSummary} onClose={monitor.dismissSessionSummary} />
      <Footer />
    </main>
  );
}
