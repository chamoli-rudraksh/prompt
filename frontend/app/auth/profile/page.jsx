"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getUser, saveTokens, getAccessToken } from "@/lib/auth";

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API = getApiUrl();
const PERSONAS = ["Investor", "Founder", "Student", "Professional"];
const TOPICS = [
  "Markets",
  "Startups",
  "Policy",
  "Technology",
  "Economy",
  "Banking",
  "Energy",
  "Geopolitics",
];

export default function ProfilePage() {
  const router = useRouter();
  const user = getUser();
  const [persona, setPersona] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleInterest(t) {
    const tl = t.toLowerCase();
    setInterests((prev) =>
      prev.includes(tl) ? prev.filter((i) => i !== tl) : [...prev, tl],
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!persona) {
      setError("Pick a persona");
      return;
    }
    if (!interests.length) {
      setError("Pick at least one topic");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`${API}/auth/update-profile`, {
        method: "POST",
        body: JSON.stringify({ persona, interests }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed");
        return;
      }

      // Update stored user with persona + interests
      const token = await getAccessToken();
      const refresh = localStorage.getItem("refresh_token");
      saveTokens(token, refresh, data.user);
      router.push("/feed");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F7F4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #E5E3DE",
          padding: "40px 44px",
          width: "100%",
          maxWidth: 460,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0A2342" }}>
            Welcome, {user?.name?.split(" ")[0] || "there"}!
          </div>
          <div style={{ fontSize: 13, color: "#6B6966", marginTop: 6 }}>
            Tell us a bit about yourself to personalise your feed
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#1A1A1A",
                display: "block",
                marginBottom: 10,
              }}
            >
              I am a...
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {PERSONAS.map((p) => {
                const active = persona === p.toLowerCase();
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPersona(p.toLowerCase())}
                    style={{
                      padding: "11px 14px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      border: active
                        ? "2px solid #0A2342"
                        : "1px solid #E5E3DE",
                      background: active ? "#0A2342" : "white",
                      color: active ? "white" : "#1A1A1A",
                      transition: "all 0.15s",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#1A1A1A",
                display: "block",
                marginBottom: 10,
              }}
            >
              Topics I follow
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {TOPICS.map((t) => {
                const active = interests.includes(t.toLowerCase());
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleInterest(t)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      cursor: "pointer",
                      border: active ? "none" : "1px solid #E5E3DE",
                      background: active ? "#0A2342" : "#F8F7F4",
                      color: active ? "white" : "#6B6966",
                      transition: "all 0.15s",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#FCEBEB",
                color: "#7C2D12",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              border: "none",
              background: loading ? "#9CA3AF" : "#E8593C",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving..." : "Start reading →"}
          </button>
        </form>
      </div>
    </div>
  );
}
