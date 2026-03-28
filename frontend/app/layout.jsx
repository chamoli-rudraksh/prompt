import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import "./globals.css";

export const metadata = {
  title: "ET NewsAI — AI-Native News Experience",
  description:
    "Intelligence-first news platform with personalized feeds, deep AI briefings, and visual story tracking. Built for ET AI Hackathon 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Design system fonts — Playfair Display (serif headlines) + DM Sans (body) + JetBrains Mono (labels) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="main-content">{children}</main>
          <KeyboardShortcuts />
        </ThemeProvider>
      </body>
    </html>
  );
}