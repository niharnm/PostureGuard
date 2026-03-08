"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Hero } from "@/components/Hero";
import { LandingPage } from "@/components/landing/LandingPage";
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
import { PostureTrendChart } from "@/components/PostureTrendChart";
import { PostureHeatmapTimeline } from "@/components/PostureHeatmapTimeline";
import { CalibrationComparisonCard } from "@/components/CalibrationComparisonCard";
import { PoseMetricsCard } from "@/components/PoseMetricsCard";
import { usePostureMonitor } from "@/hooks/usePostureMonitor";
import { useArduinoSerial } from "@/hooks/useArduinoSerial";
import { useVoiceCoach } from "@/hooks/useVoiceCoach";
import { clearGuestMode, enableGuestMode, hasGuestModeSession } from "@/lib/guest-mode";
import { formatDuration } from "@/lib/posture";

export default function HomePage() {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    if (!authenticated && hasGuestModeSession()) {
      setGuestMode(true);
    }
  }, [authenticated]);

  const accessGranted = authenticated || guestMode;

  const monitor = usePostureMonitor({
    isAuthenticated: authenticated,
    guestMode,
    userId: session?.user?.id
  });
  const arduino = useArduinoSerial();
  const voiceCoach = useVoiceCoach({
    state: monitor.state,
    alertBanner: monitor.alertBanner,
    breakMode: monitor.isBreakMode,
    monitoringActive: monitor.cameraReady
  });

  const handleBreak = useCallback(async () => {
    monitor.pauseMonitoringForBreak();
    await arduino.triggerBreak();
  }, [arduino.triggerBreak, monitor.pauseMonitoringForBreak]);

  const handleResume = useCallback(async () => {
    await monitor.resumeMonitoringFromBreak();
  }, [monitor.resumeMonitoringFromBreak]);

  const handleEndFlow = useCallback(async () => {
    if (monitor.isSessionActive) {
      await monitor.endSession();
    }
    monitor.pauseMonitoringForBreak();
    await arduino.triggerBreak();
  }, [arduino.triggerBreak, monitor.endSession, monitor.isSessionActive, monitor.pauseMonitoringForBreak]);

  useEffect(() => {
    if (monitor.isBreakMode) return;
    arduino.sendState(monitor.state);
  }, [arduino.sendState, monitor.isBreakMode, monitor.state]);

  useEffect(() => {
    if (!monitor.alertBanner) return;
    if (monitor.isBreakMode) return;
    void arduino.triggerBreak();
  }, [arduino.triggerBreak, monitor.alertBanner, monitor.isBreakMode]);

  useEffect(() => {
    if (authenticated) {
      clearGuestMode();
      setGuestMode(false);
    }
  }, [authenticated]);

  const inDashboard = useMemo(() => accessGranted, [accessGranted]);

  const enterGuestMode = useCallback(() => {
    enableGuestMode();
    setGuestMode(true);
    void monitor.startMonitoring();
  }, [monitor.startMonitoring]);

  const exitGuestMode = useCallback(() => {
    clearGuestMode();
    setGuestMode(false);
    monitor.resetExperience();
  }, [monitor.resetExperience]);

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center text-sm text-slate-300">
        Checking session...
      </main>
    );
  }

  if (!inDashboard) {
    return <LandingPage onTryDemo={enterGuestMode} />;
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Hero onStart={monitor.startMonitoring} />
        {guestMode ? (
          <section className="panel rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest Mode</p>
                <p className="text-sm text-slate-200">
                  Best for demos. Dashboard access is fully unlocked, but guest data stays temporary on this device.
                </p>
              </div>
              <button
                onClick={exitGuestMode}
                className="rounded-xl border border-slate-600/50 px-4 py-2 text-sm text-slate-200"
              >
                Back to Landing
              </button>
            </div>
          </section>
        ) : null}
        <AuthPanel guestActive={guestMode} onEnterGuestMode={enterGuestMode} onExitGuestMode={exitGuestMode} />
        <SessionControls
          authenticated={accessGranted}
          temporaryMode={guestMode}
          active={monitor.isSessionActive}
          monitoringActive={monitor.cameraReady}
          breakMode={monitor.isBreakMode}
          elapsedLabel={formatDuration(monitor.sessionElapsedMs)}
          calibrated={monitor.calibrationStatus === "CALIBRATED"}
          onStart={monitor.startSession}
          onEnd={handleEndFlow}
          onBreak={handleBreak}
          onResume={handleResume}
        />

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
            calibrationPhase={monitor.calibrationPhase}
            calibrationCountdown={monitor.calibrationCountdown}
            calibrationQuality={monitor.calibrationQuality}
            calibratedAt={monitor.calibratedAt}
            calibrationMessage={monitor.calibrationMessage}
            trackingStable={monitor.trackingStable}
            trackingConfidence={monitor.trackingConfidence}
            breakMode={monitor.isBreakMode}
            debugData={monitor.debugData}
            debugEnabled={monitor.debugEnabled}
            scoreTrend={monitor.scoreTrend}
            onCalibrate={monitor.beginCalibration}
            onDebugEnabledChange={monitor.setDebugEnabled}
            canCalibrate={accessGranted}
            temporaryMode={guestMode}
            warningBanner={monitor.alertBanner}
            overlayMetrics={monitor.overlayMetrics}
          />

          <PostureTrendChart points={monitor.postureTrend} />
          <PostureHeatmapTimeline timeline={monitor.timeline} />

          <SessionInsights
            good={monitor.insights.good}
            warn={monitor.insights.warn}
            bad={monitor.insights.bad}
            score={monitor.stats.sessionScore}
            timeline={monitor.timeline}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CalibrationComparisonCard
              calibration={monitor.calibrationSnapshot}
              current={monitor.currentSnapshot}
            />
            <PoseMetricsCard
              alertBanner={monitor.alertBanner}
              badPostureMs={monitor.badPostureMs}
              goodStreakMs={monitor.goodStreakMs}
              soundAlertEnabled={monitor.soundAlertEnabled}
              onSoundToggle={monitor.setSoundAlertEnabled}
              currentSnapshot={monitor.currentSnapshot}
              voiceCoachEnabled={voiceCoach.enabled}
              onVoiceCoachToggle={voiceCoach.setEnabled}
              voiceCoachAvailable={voiceCoach.available}
              voiceCoachConfigured={voiceCoach.configured}
            />
          </div>

          {accessGranted ? (
            <section className="space-y-3">
              {guestMode ? (
                <p className="text-xs text-slate-400">
                  Guest mode: session history is temporary and stored only in this browser.
                </p>
              ) : null}
              <SessionHistoryPanel sessions={monitor.sessionHistory} />
            </section>
          ) : (
            <section className="panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Sign In For Full Dashboard</h2>
              <p className="mt-2 text-sm text-slate-300">
                Logged-in users unlock calibration persistence, tracked sessions, and session history.
              </p>
            </section>
          )}

          <VictorPanel context={monitor.victorContext} guestMode={guestMode} />

          <MetricsExplanation />

          <ArduinoCard
            supported={arduino.supported}
            status={arduino.status}
            connectionLabel={arduino.connectionLabel}
            error={arduino.error}
            lastSent={arduino.lastSent}
            hardwareState={arduino.hardwareState}
            lastWriteStatus={arduino.lastWriteStatus}
            lastWriteMessage={arduino.lastWriteMessage}
            lastWriteAt={arduino.lastWriteAt}
            onConnect={arduino.connect}
            onDisconnect={arduino.disconnect}
            onManualSend={(signal) => {
              void arduino.sendManual(signal);
            }}
          />
        </motion.div>
      </div>
      <SessionSummaryModal summary={monitor.sessionSummary} onClose={monitor.dismissSessionSummary} />
      <Footer />
    </main>
  );
}
