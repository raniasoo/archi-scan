"use client"

import { useState, useEffect } from "react"
import { BarChart3, X, ArrowUpDown } from "lucide-react"
import { getAllProjects, type SavedProject } from "@/lib/project-storage"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts"

interface ProjectComparisonProps {
  onClose: () => void
  onLoadProject?: (id: string) => void
}

export function ProjectComparison({ onClose, onLoadProject }: ProjectComparisonProps) {
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<'roi' | 'siteArea' | 'totalInvestment' | 'name'>('roi')

  useEffect(() => {
    const all = getAllProjects()
    setProjects(all)
    // 최근 5개 자동 선택
    const recent = all.slice(0, 5).map(p => p.id)
    setSelected(new Set(recent))
  }, [])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const compared = projects
    .filter(p => selected.has(p.id))
    .sort((a, b) => {
      if (sortKey === 'roi') return (b.data.financials?.roi || 0) - (a.data.financials?.roi || 0)
      if (sortKey === 'siteArea') return (b.data.siteArea || 0) - (a.data.siteArea || 0)
      if (sortKey === 'totalInvestment') return (b.data.financials?.totalInvestment || 0) - (a.data.financials?.totalInvestment || 0)
      return a.name.localeCompare(b.name)
    })

  const chartData = compared.map(p => ({
    name: p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name,
    ROI: Number((p.data.financials?.roi || 0).toFixed(1)),
    fullName: p.name,
  }))

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">저장된 프로젝트가 없습니다.</p>
        <button onClick={onClose} className="mt-3 text-xs text-primary hover:underline">닫기</button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/20">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">프로젝트 비교 ({compared.length}개)</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* 프로젝트 선택 */}
      <div className="px-4 py-2 border-b border-border/20 flex gap-2 flex-wrap">
        {projects.map(p => (
          <button key={p.id} onClick={() => toggle(p.id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected.has(p.id)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50'
            }`}>
            {p.name}
          </button>
        ))}
      </div>

      {compared.length >= 2 && (
        <>
          {/* ROI 바 차트 */}
          <div className="px-4 py-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'ROI']} />
                <Bar dataKey="ROI" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.ROI >= 15 ? '#059669' : entry.ROI >= 5 ? '#2563eb' : entry.ROI >= 0 ? '#d97706' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 비교 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-t border-b border-border/30 bg-secondary/10">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-inherit">
                    <button onClick={() => setSortKey('name')} className="flex items-center gap-1 hover:text-foreground">
                      항목 <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  {compared.map(p => (
                    <th key={p.id} className="px-2 py-2 text-center min-w-[90px] font-medium text-foreground cursor-pointer hover:text-primary"
                      onClick={() => onLoadProject?.(p.id)}>
                      {p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '대지면적', get: (p: SavedProject) => `${(p.data.siteArea || 0).toLocaleString()}㎡`, key: 'siteArea' as const },
                  { label: '용도지역', get: (p: SavedProject) => p.data.zoneType || '-' },
                  { label: '선택 배치안', get: (p: SavedProject) => {
                    const sel = p.data.layouts?.find(l => l.id === p.data.selectedLayoutId)
                    return sel?.name || '-'
                  }},
                  { label: '층수', get: (p: SavedProject) => {
                    const sel = p.data.layouts?.find(l => l.id === p.data.selectedLayoutId)
                    return sel ? `${sel.floors}층` : '-'
                  }},
                  { label: '세대수', get: (p: SavedProject) => {
                    const sel = p.data.layouts?.find(l => l.id === p.data.selectedLayoutId)
                    return sel ? `${sel.units}세대` : '-'
                  }},
                  { label: '총사업비', get: (p: SavedProject) => {
                    const v = p.data.financials?.totalInvestment || 0
                    return v > 0 ? `${(v / 1e8).toFixed(1)}억` : '-'
                  }, key: 'totalInvestment' as const },
                  { label: '예상수익', get: (p: SavedProject) => {
                    const v = p.data.financials?.profit || 0
                    return v !== 0 ? `${(v / 1e8).toFixed(1)}억` : '-'
                  }},
                  { label: 'ROI', get: (p: SavedProject) => {
                    const v = p.data.financials?.roi
                    return v !== undefined ? `${v.toFixed(1)}%` : '-'
                  }, key: 'roi' as const, highlight: true },
                ].map((row, idx) => (
                  <tr key={row.label} className={`border-b border-border/20 ${idx % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                    <td className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap sticky left-0 bg-inherit">
                      {row.key ? (
                        <button onClick={() => setSortKey(row.key!)} className="flex items-center gap-1 hover:text-foreground">
                          {row.label} {sortKey === row.key && <ArrowUpDown className="h-2.5 w-2.5 text-primary" />}
                        </button>
                      ) : row.label}
                    </td>
                    {compared.map(p => (
                      <td key={p.id} className={`px-2 py-2 text-center ${row.highlight ? 'font-bold text-primary' : 'text-foreground'}`}>
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {compared.length < 2 && (
        <div className="px-4 py-6 text-center text-muted-foreground text-sm">
          비교할 프로젝트를 2개 이상 선택하세요.
        </div>
      )}
    </div>
  )
}
