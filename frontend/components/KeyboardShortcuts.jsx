"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const SHORTCUTS = [
  { key: "/",   description: "Focus search bar" },
  { key: "f",   description: "Go to Feed" },
  { key: "n",   description: "Go to Navigator" },
  { key: "s",   description: "Go to Story Arc" },
  { key: "d",   description: "Go to Dashboard" },
  { key: "r",   description: "Refresh feed" },
  { key: "?",   description: "Show this help" },
  { key: "Esc", description: "Close this help" },
]

export default function KeyboardShortcuts() {
  const router     = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e) {
      const tag = document.activeElement?.tagName?.toLowerCase()
      const typing = ["input","textarea","select"].includes(tag)

      if (e.key === "Escape") { setOpen(false); return }
      if (e.key === "?" && !typing) { setOpen(o => !o); return }
      if (typing) return

      if (e.key === "f") router.push("/feed")
      if (e.key === "n") router.push("/navigator")
      if (e.key === "s") router.push("/story")
      if (e.key === "d") router.push("/dashboard")
      if (e.key === "r") window.dispatchEvent(new Event("refresh-feed"))
      if (e.key === "/") {
        e.preventDefault()
        document.querySelector("input[type='search'], input[placeholder*='earch']")?.focus()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{
        position: "fixed", bottom: 20, right: 20,
        width: 36, height: 36, borderRadius: "50%",
        border: "1px solid var(--border)", background: "var(--card-bg)",
        cursor: "pointer", fontSize: 14, color: "var(--text-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        zIndex: 50,
      }}
      title="Keyboard shortcuts (?)">
      ?
    </button>
  )

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }} onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: "var(--card-bg)", borderRadius: 12,
          border: "1px solid var(--border)", padding: "28px 32px",
          minWidth: 320,
        }}>
        <div style={{ fontSize: 16, fontWeight: 500,
                      color: "var(--text-primary)", marginBottom: 20 }}>
          Keyboard shortcuts
        </div>
        {SHORTCUTS.map(s => (
          <div key={s.key}
            style={{ display: "flex", justifyContent: "space-between",
                     alignItems: "center", padding: "7px 0",
                     borderBottom: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>{s.description}</span>
            <kbd style={{
              background: "var(--pill-bg)", border: "1px solid var(--border)",
              borderRadius: 4, padding: "2px 8px",
              fontSize: 11, fontFamily: "monospace", color: "var(--text-primary)",
            }}>
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}
