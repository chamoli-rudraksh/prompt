"use client"
import { useState, useRef } from "react"

export default function AudioButton({ text }) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const uttRef = useRef(null)

  function handlePlay() {
    const synth = window.speechSynthesis
    if (!synth) {
      alert("Your browser does not support text-to-speech.")
      return
    }

    if (playing) {
      synth.cancel()
      setPlaying(false)
      return
    }

    // Clear any stale queue
    synth.cancel()

    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = speed
    utt.lang = "en-US"

    // Try to pick a voice
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

    // Chrome pauses after ~15s; keep-alive workaround
    const keepAlive = setInterval(() => {
      if (!synth.speaking) { clearInterval(keepAlive); return }
      synth.pause()
      synth.resume()
    }, 10000)
    utt.onend = () => { clearInterval(keepAlive); setPlaying(false) }
    utt.onerror = () => { clearInterval(keepAlive); setPlaying(false) }
  }

  function handleSpeedChange(newSpeed) {
    setSpeed(newSpeed)
    if (playing) {
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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={handlePlay}
        title={playing ? "Stop" : "Listen"}
        style={{
          padding: "4px 10px", borderRadius: 6,
          border: "1px solid var(--border)", cursor: "pointer",
          fontSize: 12, fontWeight: 500,
          background: playing ? "var(--et-navy)" : "var(--card-bg)",
          color: playing ? "white" : "var(--text-primary)",
          transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: 4,
        }}>
        {playing ? "■ Stop" : "▶ Listen"}
      </button>

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
  )
}
