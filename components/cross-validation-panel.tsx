"use client"

import { useState, useMemo } from "react"
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react"
import { runCrossValidation, type CrossValidationInput, type ValidationItem, type CheckStatus } from "@/lib/cross-validator"

interface CrossValidationPanelProps {
  svgParams: CrossValidationInput['svgParams']
  aiParams: CrossValidationInput['aiParams']
  regulation?: CrossValidationInput['regulation']
  hasAiRender?: boolean
  has3dCapture?: boolean
}

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '일치' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: '주의' },
  fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: '불일치' },
  skip: { icon: MinusCircle, color: 'text-white/30', bg: 'bg-white/5', label: '미확인' },
}

const CATEGORY_LABELS: Record<string, string> = {
  geometry: '형태 검증',
  parameter: '파라미터 검증',
  visual: '시각 출력 검증',
}

function ValidationRow({ item }: { item: ValidationItem }) {
  const cfg = STATUS_CONFIG[item.status]
  const Icon = cfg.icon

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${cfg.bg}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/90">{item.label}</span>
          {item.severity === 'critical' && item.status === 'fail' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">CRITICAL</span>
          )}
        </div>
        {item.status !== 'pass' && item.status !== 'skip' && (
          <div className="text-[11px] text-white/50 mt-0.5">
            {item.expected !== item.actual && (
              <span>도면: <span className="text-emerald-300">{item.expected}</span> → AI: <span className={item.status === 'fail' ? 'text-red-300' : 'text-amber-300'}>{item.actual}</span></span>
            )}
          </div>
        )}
        {item.status === 'fail' && (
          <div className="text-[10px] text-red-300/70 mt-0.5">{item.detail}</div>
        )}
      </div>
    </div>
  )
}

export function CrossValidationPanel({ svgParams, aiParams, regulation, hasAiRender, has3dCapture }: CrossValidationPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const result = useMemo(() => runCrossValidation({
    svgParams, aiParams, regulation, hasAiRender, has3dCapture,
  }), [svgParams, aiParams, regulation, hasAiRender, has3dCapture])

  const { summary } = result
  const hasFails = summary.fail > 0
  const hasWarns = summary.warn > 0

  // 카테고리별 그룹
  const grouped = useMemo(() => {
    const map = new Map<string, ValidationItem[]>()
    for (const item of result.items) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return map
  }, [result])

  const scoreColor = summary.score >= 90 ? 'text-emerald-400' : summary.score >= 70 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = summary.score >= 90 ? 'from-emerald-500/20 to-emerald-500/5' : summary.score >= 70 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5'

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* 헤더 — 항상 표시 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${scoreBg} hover:brightness-110 transition-all`}
      >
        <ShieldCheck className={`h-5 w-5 ${scoreColor}`} />
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-white/90">교차 검증</span>
          <span className="text-[11px] text-white/40 ml-2">SVG/3D ↔ AI 렌더링</span>
        </div>

        {/* 요약 배지 */}
        <div className="flex items-center gap-1.5">
          {summary.pass > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">✓{summary.pass}</span>
          )}
          {summary.warn > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">⚠{summary.warn}</span>
          )}
          {summary.fail > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">✗{summary.fail}</span>
          )}
          <span className={`text-sm font-bold ${scoreColor} ml-1`}>{summary.score}점</span>
        </div>

        {expanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {/* 상세 — 펼침 시 */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 bg-white/[0.02]">
          {/* 상태 요약 바 */}
          <div className="flex gap-0.5 h-1.5 mt-2 rounded-full overflow-hidden">
            {summary.pass > 0 && <div className="bg-emerald-400" style={{ flex: summary.pass }} />}
            {summary.warn > 0 && <div className="bg-amber-400" style={{ flex: summary.warn }} />}
            {summary.fail > 0 && <div className="bg-red-400" style={{ flex: summary.fail }} />}
            {summary.skip > 0 && <div className="bg-white/10" style={{ flex: summary.skip }} />}
          </div>

          {/* 카테고리별 검증 항목 */}
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <div className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1 px-1">
                {CATEGORY_LABELS[category] || category}
              </div>
              <div className="space-y-1">
                {items.map(item => <ValidationRow key={item.id} item={item} />)}
              </div>
            </div>
          ))}

          {/* 불일치 시 가이드 */}
          {hasFails && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-[11px] text-red-300">
                불일치 항목이 있습니다. 배치안을 변경했다면 AI 렌더링을 재생성하세요.
                재생성 후에도 불일치하면 파이프라인 버그일 수 있습니다.
              </p>
            </div>
          )}
          {!hasFails && hasWarns && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[11px] text-amber-300">
                경미한 차이가 있지만 시각적 결과에 큰 영향은 없습니다.
              </p>
            </div>
          )}
          {!hasFails && !hasWarns && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[11px] text-emerald-300">
                SVG/3D 도면과 AI 렌더링이 동일한 파라미터를 사용합니다. 형태 일치가 보장됩니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
