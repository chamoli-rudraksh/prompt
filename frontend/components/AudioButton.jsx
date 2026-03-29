"use client"
import { useState, useRef } from "react"
import { apiFetch } from "@/lib/auth"

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API = getApiUrl();

export default function AudioButton({ text, articleId }) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [mode, setMode] = useState("en") // "en" = English TTS, "hi" = Hindi vernacular
  const [loadingHindi, setLoadingHindi] = useState(false)
  const [hindiError, setHindiError] = useState("")
  const uttRef = useRef(null)
  const audioRef = useRef(null)

  function handlePlayEnglish() {
    const synth = window.speechSynthesis
    if (!synth) {
      alert("Your browser does not support text-to-speech.")
      return
    }

    if (playing && mode === "en") {
      synth.cancel()
      setPlaying(false)
      return
    }

    // Stop any Hindi audio playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    synth.cancel()

    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = speed
    utt.lang = "en-US"

    const voices = synth.getVoices()
    if (voices.length) {
      const enVoice = voices.find(v => v.lang.startsWith("en"))
      if (enVoice) utt.voice = enVoice
    }

    utt.onend = () => setPlaying(false)
    utt.onerror = () => setPlaying(false)
    uttRef.current = utt

    synth.speak(utt)
    setPlaying(true)
    setMode("en")

    // Chrome keep-alive workaround
    const keepAlive = setInterval(() => {
      if (!synth.speaking) { clearInterval(keepAlive); return }
      synth.pause()
      synth.resume()
    }, 10000)
    utt.onend = () => { clearInterval(keepAlive); setPlaying(false) }
    utt.onerror = () => { clearInterval(keepAlive); setPlaying(false) }
  }

  async function handlePlayHindi() {
    if (!articleId) {
      setHindiError("Article ID missing")
      setTimeout(() => setHindiError(""), 3000)
      return
    }

    // If already playing Hindi, stop
    if (playing && mode === "hi") {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
      setPlaying(false)
      return
    }

    // Stop English TTS if playing
    window.speechSynthesis?.cancel()

    setLoadingHindi(true)
    setHindiError("")
    setMode("hi")

    try {
      const response = await apiFetch(`${API}/story/vernacular-audio`, {
        method: "POST",
        body: JSON.stringify({ article_id: articleId }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const audio = new Audio(url)
      audio.playbackRate = speed
      audioRef.current = audio

      audio.onended = () => {
        setPlaying(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        setPlaying(false)
        setHindiError("Playback failed")
        setTimeout(() => setHindiError(""), 3000)
      }

      await audio.play()
      setPlaying(true)
    } catch (err) {
      console.error("Hindi audio error:", err)
      setHindiError(err.message || "Audio generation failed")
      setTimeout(() => setHindiError(""), 4000)
      setPlaying(false)
    } finally {
      setLoadingHindi(false)
    }
  }

  function handleSpeedChange(newSpeed) {
    setSpeed(newSpeed)
    if (playing) {
      if (mode === "hi" && audioRef.current) {
        audioRef.current.playbackRate = newSpeed
      } else if (mode === "en") {
        window.speechSynthesis.cancel()
        setTimeout(() => {
          const utt = new SpeechSynthesisUtterance(text)
          utt.rate = newSpeed
          utt.lang = "en-US"
          utt.onend = () => setPlaying(false)
          uttRef.current = utt
          window.speechSynthesis.speak(utt)
        }, 50)
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {/* English Listen */}
        <button
          onClick={handlePlayEnglish}
          title={playing && mode === "en" ? "Stop" : "Listen (English)"}
          style={{
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid var(--border)", cursor: "pointer",
            fontSize: 12, fontWeight: 500,
            background: playing && mode === "en" ? "var(--et-navy)" : "var(--card-bg)",
            color: playing && mode === "en" ? "white" : "var(--text-primary)",
            transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 4,
          }}>
          {playing && mode === "en" ? "■ Stop" : "▶ Listen"}
        </button>

        {/* Hindi Vernacular */}
        <button
          onClick={handlePlayHindi}
          disabled={loadingHindi}
          title={playing && mode === "hi" ? "Stop Hindi" : "Listen in Hindi"}
          style={{
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid var(--border)", cursor: loadingHindi ? "wait" : "pointer",
            fontSize: 12, fontWeight: 500,
            background: playing && mode === "hi" ? "#f97316" : loadingHindi ? "var(--pill-bg)" : "var(--card-bg)",
            color: playing && mode === "hi" ? "white" : loadingHindi ? "var(--text-muted)" : "var(--text-primary)",
            transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 4,
            opacity: loadingHindi ? 0.7 : 1,
          }}>
          {loadingHindi ? (
            <>
              <span style={{
                display: "inline-block", width: 10, height: 10,
                border: "2px solid var(--text-muted)", borderTopColor: "var(--et-coral)",
                borderRadius: "50%", animation: "spin 0.6s linear infinite",
              }} />
              Generating...
            </>
          ) : playing && mode === "hi" ? (
            "■ Stop"
          ) : (
            "🇮🇳 हिंदी"
          )}
        </button>

        {/* Speed controls */}
        {[0.8, 1, 1.5, 2].map(s => (
          <button key={s}
            onClick={() => handleSpeedChange(s)}
            style={{
              padding: "3px 7px", borderRadius: 4,
              border: "1px solid var(--border)", cursor: "pointer",
              fontSize: 11,
              background: speed === s ? "var(--et-coral)" : "var(--card-bg)",
              color: speed === s ? "white" : "var(--text-secondary)",
            }}>
            {s}x
          </button>
        ))}
      </div>

      {/* Error message */}
      {hindiError && (
        <div style={{
          fontSize: 11, color: "#ff6b6b", padding: "3px 8px",
          background: "rgba(255,107,107,0.1)", borderRadius: 4,
        }}>
          {hindiError}
        </div>
      )}
    </div>
  )
}
