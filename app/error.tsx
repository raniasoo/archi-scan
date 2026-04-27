"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[AppError]", error)
  }, [error])

  return (
    <div style={{
      padding: "40px 20px",
      fontFamily: "sans-serif",
      color: "#fff",
      background: "#111",
      minHeight: "100vh"
    }}>
      <h1 style={{ color: "#f87171", fontSize: "20px", marginBottom: "12px" }}>
        앱 로딩 중 오류 발생
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
          fontSize: "16px",
          cursor: "pointer"
        }}
      >
        다시 시도
      </button>
    </div>
  )
}
