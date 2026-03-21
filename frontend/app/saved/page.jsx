"use client"
import { useState, useEffect } from "react"
import AuthGuard from "@/components/AuthGuard"
import ArticleCard from "@/components/ArticleCard"
import { apiFetch } from "@/lib/auth"

const API = process.env.NEXT_PUBLIC_API_URL

export default function SavedPage() {
  return <AuthGuard><SavedArticles /></AuthGuard>
}

function SavedArticles() {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`${API}/articles/saves`)
        const d   = await res.json()
        setArticles(d.articles || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px",
                   color: "var(--text-primary)" }}>
        Saved articles
      </h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40,
                      color: "var(--text-secondary)", fontSize: 14 }}>
          Loading saved articles...
        </div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem",
                      background: "var(--card-bg)", borderRadius: 12,
                      border: "1px dashed var(--border)",
                      color: "var(--text-secondary)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 500 }}>
            No saved articles yet
          </h2>
          <p style={{ margin: 0, fontSize: 14 }}>
            Bookmark articles from your feed to see them here.
          </p>
        </div>
      ) : (
        <div className="feed-grid">
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
