"use client";

import { HeroSection } from "@/components/landing/HeroSection";
import { ProductOverviewSection } from "@/components/landing/ProductOverviewSection";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { AccountBenefitsSection } from "@/components/landing/AccountBenefitsSection";
import { HardwareSection } from "@/components/landing/HardwareSection";
import { VictorSection } from "@/components/landing/VictorSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/Footer";

type Props = {
  onTryDemo: () => void;
};

export function LandingPage({ onTryDemo }: Props) {
  return (
    <main className="min-h-screen landing-gradient">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
        <HeroSection onTryDemo={onTryDemo} />
        <ProductOverviewSection />
        <FeatureSection />
        <DemoSection onTryDemo={onTryDemo} />
        <AccountBenefitsSection />
        <HardwareSection />
        <VictorSection />
        <FinalCTASection onTryDemo={onTryDemo} />
      </div>
      <Footer />
    </main>
  );
}
