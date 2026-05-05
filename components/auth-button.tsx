"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { LogOut, User, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"

const PROVIDERS = [
  {
    id: "kakao",
    name: "카카오로 시작",
    bg: "bg-[#FEE500]",
    hover: "hover:bg-[#FEE500]/20",
    icon: (
      <div className="w-8 h-8 rounded-full bg-[#FEE500] flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M9 0.6C4.03 0.6 0 3.713 0 7.537c0 2.466 1.642 4.632 4.108 5.858l-1.05 3.848c-.093.34.295.614.589.416L7.76 14.97c.407.054.822.083 1.24.083 4.97 0 9-3.113 9-6.937S13.97.6 9 .6" fill="#191919"/>
        </svg>
      </div>
    ),
  },
  {
    id: "naver",
    name: "네이버로 시작",
    bg: "bg-[#03C75A]",
    hover: "hover:bg-[#03C75A]/10",
    icon: (
      <div className="w-8 h-8 rounded-full bg-[#03C75A] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-black">N</span>
      </div>
    ),
  },
  {
    id: "google",
    name: "구글로 시작",
    bg: "bg-white",
    hover: "hover:bg-muted/80",
    icon: (
      <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>
    ),
  },
]

export function AuthButton() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/auth/providers")
      .then(r => r.json())
      .then(data => setAvailable(Object.keys(data)))
      .catch(() => setAvailable(["kakao"]))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (status === "loading") {
    return <div className="h-9 w-20 rounded-full bg-muted animate-pulse" />
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full bg-muted/50 pl-3 pr-1 py-1">
          <span className="text-sm font-medium text-foreground hidden sm:inline max-w-[80px] truncate">
            {session.user.name}
          </span>
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "프로필"}
              width={28}
              height={28}
              className="rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
        <button
          onClick={() => signOut()}
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
          title="로그아웃"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    )
  }

  const activeProviders = PROVIDERS.filter(p => available.includes(p.id))

  // 프로바이더가 1개면 바로 로그인
  if (activeProviders.length === 1) {
    return (
      <button
        onClick={() => signIn(activeProviders[0].id)}
        className="flex items-center gap-2 rounded-full bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M9 0.6C4.03 0.6 0 3.713 0 7.537c0 2.466 1.642 4.632 4.108 5.858l-1.05 3.848c-.093.34.295.614.589.416L7.76 14.97c.407.054.822.083 1.24.083 4.97 0 9-3.113 9-6.937S13.97.6 9 .6" fill="#191919"/>
        </svg>
        카카오 로그인
      </button>
    )
  }

  // 여러 프로바이더면 드롭다운
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
      >
        <User className="h-4 w-4" />
        로그인
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="p-2 space-y-1">
            {activeProviders.map(p => (
              <button
                key={p.id}
                onClick={() => { setOpen(false); signIn(p.id) }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 ${p.hover} transition-colors`}
              >
                {p.icon}
                <span className="text-sm font-medium text-foreground">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
