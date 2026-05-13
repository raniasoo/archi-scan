"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface Notice {
  id: string
  title: string
  content: string
  type: string
  is_pinned: boolean
  created_at: string
}

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'ℹ️' },
  update: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '🆕' },
  maintenance: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '🔧' },
  promo: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', icon: '🎉' },
}

export function NoticeBanner() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // 세션에서 닫은 공지 복원
    try {
      const saved = sessionStorage.getItem('dismissed-notices')
      if (saved) setDismissed(new Set(JSON.parse(saved)))
    } catch {}

    // 공지 로드
    fetch('/api/notices')
      .then(r => r.json())
      .then(d => setNotices(d.notices || []))
      .catch(() => {})
  }, [])

  const dismiss = (id: string) => {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    try { sessionStorage.setItem('dismissed-notices', JSON.stringify([...next])) } catch {}
  }

  const visible = notices.filter(n => !dismissed.has(n.id))
  const latest = visible[0]

  if (!latest) return null

  const style = TYPE_STYLES[latest.type] || TYPE_STYLES.info

  return (
    <div className={`${style.bg} border-b ${style.border}`}>
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="text-sm flex-shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium truncate block w-full text-left"
          >
            {latest.title}
          </button>
          {expanded && (
            <p className="text-[11px] text-muted-foreground mt-1">{latest.content}</p>
          )}
        </div>
        {visible.length > 1 && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">+{visible.length - 1}</span>
        )}
        <button onClick={() => dismiss(latest.id)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
