import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
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