"use client"
import { useEffect, useState } from "react"

const KEY     = "et_search_history"
const MAX     = 5

export function saveSearch(query) {
  try {
    const history = getHistory()
    const updated = [query, ...history.filter(h => h !== query)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {}
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch { return [] }
}

export default function SearchHistory({ onSelect }) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  if (!history.length) return null

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)",
                    marginBottom: 6, fontWeight: 500,
                    textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Recent searches
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {history.map(h => (
          <button key={h} onClick={() => onSelect(h)}
            style={{
              padding: "4px 12px", borderRadius: 20,
              border: "1px solid var(--border)", background: "var(--pill-bg)",
              cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--pill-bg)"}>
            {h}
          </button>
        ))}
      </div>
    </div>
  )
}
