"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens } from "@/lib/auth";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const accessToken  = params.get("access_token");
    const needsProfile = params.get("needs_profile") === "true";

    if (!accessToken) {
      router.replace("/auth?error=google_failed");
      return;
    }

    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const user = {
        id:    payload.sub,
        email: payload.email,
        name:  payload.name || payload.email.split("@")[0],
      };
      saveTokens(accessToken, user);
      router.replace(needsProfile ? "/auth/profile" : "/feed");
    } catch {
      router.replace("/auth?error=google_failed");
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 500 }}>
          Signing you in...
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
          Please wait
        </div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>Loading...</div>
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
