"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ko">
      <body style={{
        padding: "40px 20px",
        fontFamily: "sans-serif",
        color: "#fff",
        background: "#111",
        margin: 0
      }}>
        <h1 style={{ color: "#f87171", fontSize: "20px", marginBottom: "12px" }}>
          Archi-Scan 오류
        </h1>
        <p style={{ color: "#fbbf24", fontSize: "14px", marginBottom: "16px" }}>
          {error?.message || "알 수 없는 오류"}
        </p>
        <pre style={{
          background: "#222",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "10px",
          overflow: "auto",
          maxHeight: "250px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          color: "#a3a3a3"
        }}>
          {error?.stack || "스택 정보 없음"}
        </pre>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "20px",
            padding: "12px 24px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px"
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  )
}
