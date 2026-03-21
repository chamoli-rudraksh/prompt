"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens, isLoggedIn, apiFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;
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

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    persona: "",
    interests: [],
  });

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/feed");
      return;
    }

    // Handle errors from Google OAuth redirect
    const err = params.get("error");
    if (err === "google_denied") setError("Google sign-in was cancelled");
    if (err === "google_failed") setError("Google sign-in failed. Try again.");
    if (err === "email_exists") {
      const email = params.get("email");
      setError(
        `${email} is already registered with email/password. Sign in that way.`,
      );
    }
  }, []);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  function toggleInterest(topic) {
    const t = topic.toLowerCase();
    set(
      "interests",
      form.interests.includes(t)
        ? form.interests.filter((i) => i !== t)
        : [...form.interests, t],
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (mode === "register" && step === 1) {
      if (!form.name || !form.email || !form.password) {
        setError("All fields are required");
        return;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      setStep(2);
      return;
    }

    if (mode === "register" && step === 2) {
      if (!form.persona) {
        setError("Please select a persona");
        return;
      }
      if (!form.interests.length) {
        setError("Select at least one topic");
        return;
      }
    }

    setLoading(true);
    setError("");

    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    const body =
      mode === "login" ? { email: form.email, password: form.password } : form;

    try {
      const res = await apiFetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Something went wrong");
        if (mode === "register") setStep(1);
        return;
      }
      saveTokens(data.access_token, data.refresh_token, data.user);
      router.push("/feed");
    } catch {
      setError("Could not connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    // Redirect to backend which redirects to Google
    window.location.href = `${API}/auth/google`;
  }

  const isRegister = mode === "register";

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
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#0A2342" }}>
            ET <span style={{ color: "#E8593C" }}>NewsAI</span>
          </div>
          <div style={{ fontSize: 13, color: "#6B6966", marginTop: 6 }}>
            {!isRegister
              ? "Welcome back"
              : step === 1
                ? "Create your account"
                : "Personalise your experience"}
          </div>
        </div>

        {/* Tab toggle */}
        <div
          style={{
            display: "flex",
            background: "#F8F7F4",
            borderRadius: 10,
            padding: 4,
            marginBottom: 28,
            gap: 4,
          }}
        >
          {[
            ["login", "Sign in"],
            ["register", "Register"],
          ].map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setStep(1);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "#0A2342" : "#6B6966",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Step progress for register */}
        {isRegister && (
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {[1, 2].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: step >= s ? "#0A2342" : "#E5E3DE",
                  transition: "background 0.25s",
                }}
              />
            ))}
          </div>
        )}

        {/* Google button — show on login and register step 1 */}
        {(!isRegister || step === 1) && (
          <>
            <button
              onClick={handleGoogleLogin}
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 8,
                border: "1px solid #E5E3DE",
                background: "white",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                color: "#1A1A1A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "border-color 0.15s, background 0.15s",
                marginBottom: 20,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F8F7F4")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              {/* Google SVG icon */}
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.6 2.4 30.1 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6.1C12.4 13.1 17.7 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6.1A23.8 23.8 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8-6.1z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.1 0 11.2-2 14.9-5.4l-7.5-5.8c-2 1.4-4.7 2.2-7.4 2.2-6.3 0-11.6-4.2-13.5-9.9l-8 6.1C6.7 42.6 14.7 48 24 48z"
                />
              </svg>
              Continue with Google
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#E5E3DE" }} />
              <span style={{ fontSize: 12, color: "#9B9895" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#E5E3DE" }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Login fields */}
          {!isRegister && (
            <>
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="you@example.com"
              />
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
                placeholder="••••••••"
              />
            </>
          )}

          {/* Register step 1 */}
          {isRegister && step === 1 && (
            <>
              <Field
                label="Full name"
                value={form.name}
                onChange={(v) => set("name", v)}
                placeholder="Rahul Sharma"
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="you@example.com"
              />
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
                placeholder="Minimum 6 characters"
              />
            </>
          )}

          {/* Register step 2 — persona + interests */}
          {isRegister && step === 2 && (
            <>
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
                    const active = form.persona === p.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => set("persona", p.toLowerCase())}
                        style={{
                          padding: "11px 14px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                          transition: "all 0.15s",
                          border: active
                            ? "2px solid #0A2342"
                            : "1px solid #E5E3DE",
                          background: active ? "#0A2342" : "white",
                          color: active ? "white" : "#1A1A1A",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  Topics I follow
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {TOPICS.map((t) => {
                    const active = form.interests.includes(t.toLowerCase());
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
                          fontWeight: active ? 500 : 400,
                          transition: "all 0.15s",
                          border: active ? "none" : "1px solid #E5E3DE",
                          background: active ? "#0A2342" : "#F8F7F4",
                          color: active ? "white" : "#6B6966",
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#FCEBEB",
                color: "#7C2D12",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
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
              transition: "background 0.15s",
              marginTop: 4,
            }}
          >
            {loading
              ? "Please wait..."
              : !isRegister
                ? "Sign in"
                : step === 1
                  ? "Continue →"
                  : "Start reading →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#1A1A1A",
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          border: `1px solid ${focused ? "#0A2342" : "#E5E3DE"}`,
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          background: "white",
          color: "#1A1A1A",
          boxShadow: focused ? "0 0 0 3px rgba(10,35,66,0.08)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      />
    </div>
  );
}
