"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/auth");
    } else {
      setReady(true);
    }
  }, []);

  if (!ready)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F7F4",
        }}
      >
        <div style={{ fontSize: 14, color: "#6B6966" }}>Loading...</div>
      </div>
    );

  return children;
}
