import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ET NewsAI — AI-Native News Experience",
  description:
    "Intelligence-first news platform with personalized feeds, deep AI briefings, and visual story tracking. Built for ET AI Hackathon 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
