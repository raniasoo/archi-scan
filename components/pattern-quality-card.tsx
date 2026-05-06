"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Leaf, BookOpen, Hexagon } from "lucide-react"
import { type PatternQualityResult } from "@/lib/pattern-quality"

export function PatternQualityCard({ result }: { result: PatternQualityResult }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showLiving, setShowLiving] = useState(false)

  return (
    <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/80 dark:to-teal-950/80">
      {/* Header — 항상 보이는 요약 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">설계 품질 평가</h3>
            <p className="text-xs text-muted-foreground">Alexander Pattern Language 기반</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 등급 뱃지 */}
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-lg"
              style={{ backgroundColor: result.gradeColor }}
            >
              {result.grade}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{result.overallQuality}점</p>
              <p className="text-[10px] text-muted-foreground">/ 100</p>
            </div>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* 점수 요약 바 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-foreground">패턴 점수</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{result.totalPatternScore}</span>
                <span className="text-[10px] text-muted-foreground mb-0.5">/ 100</span>
              </div>
              <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${result.totalPatternScore}%` }} />
              </div>
            </div>
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Hexagon className="h-3.5 w-3.5 text-teal-500" />
                <span className="text-xs font-bold text-foreground">Living Structure</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-black text-teal-600 dark:text-teal-400">{result.totalLivingScore}</span>
                <span className="text-[10px] text-muted-foreground mb-0.5">/ 100</span>
              </div>
              <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${result.totalLivingScore}%` }} />
              </div>
            </div>
          </div>

          {/* 설계 철학 서술 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border-l-4 border-emerald-500">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">📖 설계 철학</p>
            <p className="text-xs text-foreground leading-relaxed">{result.philosophy}</p>
          </div>

          {/* 패턴 상세 — 상위 6개 */}
          <div>
            <p className="text-xs font-semibold mb-2">핵심 패턴 평가 (12개)</p>
            <div className="space-y-1.5">
              {result.patterns
                .sort((a, b) => b.score - a.score)
                .slice(0, 6)
                .map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-emerald-600 dark:text-emerald-400 font-medium">#{p.id}</span>
                  <span className="flex-1 truncate">{p.nameKr}</span>
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.score}%`,
                        backgroundColor: p.score >= 80 ? "#22c55e" : p.score >= 60 ? "#3b82f6" : "#f59e0b"
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono font-semibold">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Living Structure 토글 */}
          <button
            onClick={() => setShowLiving(!showLiving)}
            className="w-full text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center justify-center gap-1"
          >
            {showLiving ? "15속성 접기" : "Living Structure 15속성 보기"}
            {showLiving ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showLiving && (
            <div className="space-y-1.5">
              {result.livingStructure.map(s => (
                <div key={s.property} className="flex items-center gap-2 text-xs">
                  <span className="flex-1">{s.propertyKr}</span>
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.score}%`,
                        backgroundColor: s.score >= 80 ? "#14b8a6" : s.score >= 60 ? "#0ea5e9" : "#f97316"
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono font-semibold">{s.score}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Christopher Alexander, A Pattern Language (1977) · The Nature of Order (2002)
          </p>
        </div>
      )}
    </div>
  )
}
