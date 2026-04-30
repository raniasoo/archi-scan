"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, User, ChevronDown } from "lucide-react"

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  if (loading) return null

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={signInWithGoogle}
      >
        <LogIn className="h-3.5 w-3.5" />
        로그인
      </Button>
    )
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "사용자"
  const avatar = user.user_metadata?.avatar_url

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-5 w-5 rounded-full" />
        ) : (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="max-w-[80px] truncate">{displayName}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-background shadow-lg p-1">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
              {user.email}
            </div>
            <button
              onClick={() => { signOut(); setShowMenu(false) }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  )
}
