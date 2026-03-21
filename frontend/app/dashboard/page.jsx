"use client"
import { useState, useEffect } from "react"
import AuthGuard from "@/components/AuthGuard"
import { apiFetch } from "@/lib/auth"

const API = process.env.NEXT_PUBLIC_API_URL

export default function DashboardPage() {
  return <AuthGuard><Dashboard /></AuthGuard>
}

function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/market`)
      const d   = await res.json()
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center",
                  color: "var(--text-secondary)", fontSize: 14 }}>
      Fetching live market data...
    </div>
  )

  if (!data) return null

  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500,
                       margin: 0, color: "var(--text-primary)" }}>
            Market pulse
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Updated every 5 minutes ·{" "}
            {data.updated_at
              ? new Date(data.updated_at * 1000).toLocaleTimeString("en-IN")
              : ""}
          </p>
        </div>
        <button onClick={load}
          style={{ padding: "8px 16px", borderRadius: 8,
                   border: "1px solid var(--border)", background: "var(--card-bg)",
                   cursor: "pointer", fontSize: 13, color: "var(--text-primary)" }}>
          Refresh
        </button>
      </div>

      <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 16, marginBottom: 32 }}>
        {data.indices.map(idx => (
          <div key={idx.symbol}
            style={{ background: "var(--card-bg)", borderRadius: 12,
                     border: "1px solid var(--border)", padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)",
                          fontWeight: 500, marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em" }}>
              {idx.short}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600,
                          color: "var(--text-primary)", marginBottom: 4 }}>
              {idx.current.toLocaleString("en-IN")}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 500, marginBottom: 12,
              color: idx.is_positive ? "var(--et-teal)" : "var(--et-red)",
            }}>
              {idx.is_positive ? "▲" : "▼"}{" "}
              {Math.abs(idx.change).toLocaleString("en-IN")}{" "}
              ({idx.change_pct > 0 ? "+" : ""}{idx.change_pct}%)
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)",
                          lineHeight: 1.5, borderTop: "1px solid var(--border)",
                          paddingTop: 10 }}>
              {idx.commentary}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
