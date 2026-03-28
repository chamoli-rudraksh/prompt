"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveTokens, isLoggedIn } from "@/lib/auth";

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

function AuthPageInner() {
  const router = useRouter();
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
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Something went wrong");
        if (mode === "register") setStep(1);
        return;
      }
      saveTokens(data.access_token, data.user);
      router.push("/feed");
    } catch {
      setError("Could not connect to server. Check if backend is running and CORS is configured.");
    } finally {
      setLoading(false);
    }
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
              type="button"
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

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</div>
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}
