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

    // ChunkLoadError 감지 → 자동 새로고침 (배포 후 stale cache 문제)
    const isChunkError =
      error?.message?.includes("ChunkLoadError") ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed")

    if (isChunkError) {
      // 무한 루프 방지: sessionStorage로 이미 시도했는지 확인
      const reloadKey = "chunk-error-reload"
      const lastReload = sessionStorage.getItem(reloadKey)
      const now = Date.now()

      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(now))
        window.location.reload()
        return
      }
    }
  }, [error])

  const isChunkError =
    error?.message?.includes("ChunkLoadError") ||
    error?.message?.includes("Loading chunk")

  return (
    <div style={{
      padding: "40px 20px",
      fontFamily: "sans-serif",
      color: "#fff",
      background: "#111",
      minHeight: "100vh"
    }}>
      <h1 style={{ color: "#f87171", fontSize: "20px", marginBottom: "12px" }}>
        {isChunkError ? "앱이 업데이트되었습니다" : "앱 로딩 중 오류 발생"}
      </h1>
      <p style={{ color: "#fbbf24", fontSize: "14px", marginBottom: "16px" }}>
        {isChunkError
          ? "새 버전이 배포되어 페이지를 새로고침합니다."
          : (error?.message || "알 수 없는 오류")}
      </p>
      {!isChunkError && (
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
      )}
      <button
        onClick={() => isChunkError ? window.location.reload() : reset()}
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
        새로고침
      </button>
    </div>
  )
}
