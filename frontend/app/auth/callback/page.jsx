"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const needsProfile = params.get("needs_profile") === "true";

    if (!accessToken) {
      router.replace("/auth?error=google_failed");
      return;
    }

    // Decode user info from token
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split("@")[0],
      };
      saveTokens(accessToken, refreshToken, user);

      // New Google users need to pick persona + interests
      if (needsProfile) {
        router.replace("/auth/profile");
      } else {
        router.replace("/feed");
      }
    } catch {
      router.replace("/auth?error=google_failed");
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F7F4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, color: "#0A2342", fontWeight: 500 }}>
          Signing you in...
        </div>
        <div style={{ fontSize: 13, color: "#6B6966", marginTop: 8 }}>
          Please wait
        </div>
      </div>
    </div>
  );
}
