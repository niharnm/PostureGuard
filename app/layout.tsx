import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains"
});

export const metadata: Metadata = {
  title: "PostureGaurd | Real-Time AI Posture Coach",
  description:
    "PostureGaurd is a real-time AI posture monitoring app with live coaching, session insights, and optional Arduino feedback. Gaurd is spelled that way on purpose."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} font-[var(--font-space-grotesk)]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
