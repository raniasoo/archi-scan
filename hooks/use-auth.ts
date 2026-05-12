"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { trackLogin, trackSignUp } from "@/components/google-analytics"

export interface UsageInfo {
  plan: string
  monthly_usage: number
  monthly_limit: number
  can_analyze: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch usage when user changes
  useEffect(() => {
    if (user) {
      fetchUsage()
    } else {
      setUsage(null)
    }
  }, [user?.id])

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      }
    } catch (err) {
      console.error("[AUTH] Usage fetch error:", err)
    }
  }, [])

  const trackUsage = useCallback(async (action: string, metadata?: Record<string, any>) => {
    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, metadata }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error, code: data.code }
      }
      // Refresh usage
      await fetchUsage()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchUsage])

  const signInWithGoogle = useCallback(async () => {
    trackLogin('google')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) console.error("Google login error:", error.message)
  }, [])

  const signInWithKakao = useCallback(async () => {
    trackLogin('kakao')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) console.error("Kakao login error:", error.message)
  }, [])

  const signInWithNaver = useCallback(async () => {
    trackLogin('naver')
    // 네이버는 커스텀 OAuth 라우트로 처리
    window.location.href = "/api/auth/naver"
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    trackLogin('email')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    trackSignUp('email')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUsage(null)
    window.location.href = '/landing'
  }, [])

  return {
    user,
    loading,
    usage,
    fetchUsage,
    trackUsage,
    signInWithGoogle,
    signInWithKakao,
    signInWithNaver,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}
