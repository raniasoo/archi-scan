"use client"

import React from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: string
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: "" }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo: errorInfo.componentStack || ""
    })
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "40px 20px",
          fontFamily: "sans-serif",
          color: "#fff",
          background: "#111",
          minHeight: "100vh"
        }}>
          <h1 style={{ color: "#f87171", fontSize: "20px" }}>
            앱 로딩 중 오류 발생
          </h1>
          <p style={{ color: "#fbbf24", margin: "16px 0", fontSize: "14px" }}>
            {this.state.error?.message || "Unknown error"}
          </p>
          <pre style={{
            background: "#222",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "11px",
            overflow: "auto",
            maxHeight: "300px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          }}>
            {this.state.error?.stack || ""}
            {"\n\n--- Component Stack ---\n"}
            {this.state.errorInfo}
          </pre>
          <button
            onClick={() => window.location.reload()}
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
            새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
