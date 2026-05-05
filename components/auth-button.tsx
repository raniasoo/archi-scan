"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { LogOut, User } from "lucide-react"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    )
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

  return (
    <button
      onClick={() => signIn("kakao")}
      className="flex items-center gap-2 rounded-full bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 0.6C4.03 0.6 0 3.713 0 7.537c0 2.466 1.642 4.632 4.108 5.858l-1.05 3.848c-.093.34.295.614.589.416L7.76 14.97c.407.054.822.083 1.24.083 4.97 0 9-3.113 9-6.937S13.97.6 9 .6"
          fill="#191919"
        />
      </svg>
      카카오 로그인
    </button>
  )
}
