"use client"

import { useState } from "react"
import { Sparkles, Palette, MessageSquare, FileText, Copy, Check, Loader2, X, Download } from "lucide-react"

// ─── 인터페이스 ───
export interface AIHubInput {
  address: string
  zoneType: string
  zoneName: string
  siteArea: number
  layoutName: string
  floors: number
  units: number
  buildingCoverageRatio: number
  floorAreaRatio: number
  roi: number
  totalProjectCost: number
  strategy: string
  coverage: number
}

// ─── 스타일 프리셋 ───
const STYLES = [
  { id: "modern-luxury", label: "모던 럭셔리", emoji: "🏢", prompt: "sleek modern luxury, glass curtain wall, premium finishes, night lighting" },
  { id: "eco-green", label: "친환경 녹색", emoji: "🌿", prompt: "eco-friendly green building, vertical garden, rooftop greenery, sustainable materials" },
  { id: "korean-modern", label: "한국 모던", emoji: "🏛", prompt: "korean contemporary architecture, hanok-inspired curves, natural materials, warm tones" },
  { id: "minimalist", label: "미니멀리즘", emoji: "◻️", prompt: "minimalist architecture, clean white surfaces, geometric forms, natural light" },
  { id: "urban-mixed", label: "도시 복합", emoji: "🌆", prompt: "urban mixed-use complex, street-level retail, podium tower, vibrant streetscape" },
  { id: "premium-resi", label: "프리미엄 주거", emoji: "🏠", prompt: "premium residential tower, terrace balconies, landscaped courtyard, community amenities" },
]

type TabId = 'render' | 'consult' | 'proposal' | 'prompt'

// ─── 프롬프트 생성 함수 ───
function buildMidjourneyPrompt(input: AIHubInput, styleId: string): string {
  const style = STYLES.find(s => s.id === styleId)
  if (!style) return ""
  const floorDesc = input.floors <= 5 ? "low-rise" : input.floors <= 15 ? "mid-rise" : "high-rise"
  const scaleDesc = input.siteArea > 1000 ? "large-scale" : input.siteArea > 500 ? "medium-scale" : "compact"
  const strategyDesc = input.strategy === "area-maximize" ? "maximum floor area efficiency" :
    input.strategy === "view-priority" ? "panoramic view oriented" :
    input.strategy === "profitability" ? "profit-optimized" :
    input.strategy === "livability" ? "livability focused, courtyard" : "balanced architectural approach"
  return `${scaleDesc} ${floorDesc} ${input.layoutName} building in Seoul South Korea, ${input.zoneName}, ${input.floors} floors, ${strategyDesc}, ${style.prompt}, architectural exterior rendering, photorealistic, golden hour lighting, 4K --ar 16:9 --v 6.1`
}

function buildClaudePrompt(input: AIHubInput, styleId: string): string {
  const style = STYLES.find(s => s.id === styleId)
  if (!style) return ""
  return `당신은 건축설계 전문가입니다. 아래 조건으로 건축 컨셉 디자인을 제안해주세요.

## 프로젝트 조건
- 위치: ${input.address}
- 용도지역: ${input.zoneName}
- 대지면적: ${input.siteArea.toLocaleString()}㎡
- 배치 유형: ${input.layoutName}
- 규모: 지상 ${input.floors}층, ${input.units}세대
- 건폐율: ${input.buildingCoverageRatio}% / 용적률: ${input.floorAreaRatio}%
- 총사업비: ${(input.totalProjectCost / 100000000).toFixed(1)}억원
- 스타일: ${style.label}

## 요청사항
1. 건축 매스 컨셉과 배치 전략
2. 파사드 디자인 (재료, 패턴, 색상)
3. 외부 공간 (조경, 동선, 주차)
4. 차별화 포인트
5. 참고 사례 2~3개`
}

// ─── 메인 컴포넌트 ───
export function AIHub({ input }: { input: AIHubInput }) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null)
  const [selectedStyle, setSelectedStyle] = useState("modern-luxury")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedType, setCopiedType] = useState<string | null>(null)

  // 렌더링
  const [renderImage, setRenderImage] = useState<string | null>(null)
  // 상담
  const [consultQuestion, setConsultQuestion] = useState('')
  const [consultAnswer, setConsultAnswer] = useState<string | null>(null)
  // 제안서
  const [proposalContent, setProposalContent] = useState<string | null>(null)

  const styleLabel = STYLES.find(s => s.id === selectedStyle)?.label || '모던 럭셔리'

  const handleCopy = async (text: string, type: string) => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement("textarea"); ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta)
    }
    setCopiedType(type); setTimeout(() => setCopiedType(null), 2000)
  }

  const handleRender = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${input.layoutName} building design`, style: selectedStyle, address: input.address, layoutName: input.layoutName, floors: input.floors, units: input.units, siteArea: input.siteArea }),
      })
      const data = await res.json()
      if (data.success && data.image) setRenderImage(data.image)
      else setError(data.error || '렌더링 생성 실패')
    } catch (e) { setError(e instanceof Error ? e.message : '네트워크 오류') }
    finally { setLoading(false) }
  }

  const handleConsult = async () => {
    if (!consultQuestion.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-consult', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: consultQuestion, context: { address: input.address, siteArea: input.siteArea, layoutName: input.layoutName, floors: input.floors, units: input.units, coverage: input.coverage, zoneType: input.zoneType, roi: input.roi } }),
      })
      const data = await res.json()
      if (data.success) setConsultAnswer(data.answer)
      else setError(data.error || '상담 실패')
    } catch (e) { setError(e instanceof Error ? e.message : '네트워크 오류') }
    finally { setLoading(false) }
  }

  const handleProposal = async (type: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context: { projectName: `${input.address} 개발사업`, address: input.address, siteArea: `${input.siteArea}㎡`, layoutName: input.layoutName, floors: `지상 ${input.floors}층`, units: `${input.units}세대`, coverage: `${input.coverage}%`, roi: `${input.roi.toFixed(1)}%`, totalCost: `${(input.totalProjectCost / 100000000).toFixed(1)}억원` } }),
      })
      const data = await res.json()
      if (data.success) setProposalContent(data.content)
      else setError(data.error || '제안서 생성 실패')
    } catch (e) { setError(e instanceof Error ? e.message : '네트워크 오류') }
    finally { setLoading(false) }
  }

  const tabs: { id: TabId; label: string; icon: typeof Palette; color: string; sub: string }[] = [
    { id: 'render', label: '렌더링', icon: Palette, color: 'emerald', sub: '나노바나나' },
    { id: 'consult', label: '설계상담', icon: MessageSquare, color: 'blue', sub: 'Claude' },
    { id: 'proposal', label: '제안서', icon: FileText, color: 'amber', sub: 'ChatGPT' },
    { id: 'prompt', label: '프롬프트', icon: Copy, color: 'purple', sub: '복사용' },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    blue: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    amber: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    purple: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-blue-950/50 overflow-hidden">
      {/* 헤더 + 스타일 선택 */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI 허브</h3>
            <p className="text-[10px] text-muted-foreground">렌더링 · 설계상담 · 제안서 · 프롬프트</p>
          </div>
        </div>

        {/* 스타일 선택 (콤팩트) */}
        <div className="flex gap-1.5 flex-wrap">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setSelectedStyle(s.id)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                selectedStyle === s.id
                  ? 'bg-violet-500/20 border-violet-400/50 text-violet-300 font-semibold'
                  : 'bg-card/20 border-border/30 text-muted-foreground hover:border-violet-400/30'
              }`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4개 탭 */}
      <div className="grid grid-cols-4 border-t border-violet-500/10">
        {tabs.map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all border-b-2 ${
                isActive ? `${colorMap[t.color]} border-current bg-opacity-10` : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* 에러 */}
      {error && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-start gap-2">
          <X className="h-4 w-4 text-red-400 shrink-0 cursor-pointer" onClick={() => setError(null)} />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      {activeTab && (
        <div className="p-4 pt-3">
          {/* 🎨 렌더링 */}
          {activeTab === 'render' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">스타일:</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium">{styleLabel}</span>
              </div>
              <button onClick={handleRender} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />생성 중 (10~20초)...</> : <>🎨 건축 렌더링 생성</>}
              </button>
              {renderImage && (
                <div className="space-y-2">
                  <img src={renderImage} alt="AI 건축 렌더링" className="w-full rounded-lg border border-border" />
                  <a href={renderImage} download={`archiscan-render-${Date.now()}.png`}
                    className="flex items-center justify-center gap-1 text-xs text-emerald-400 hover:underline">
                    <Download className="h-3 w-3" /> 이미지 다운로드
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 💬 설계상담 */}
          {activeTab === 'consult' && (
            <div className="space-y-3">
              <div className="flex gap-1.5 flex-wrap">
                {['이 배치안의 장단점은?', '규제 리스크는?', '설계 개선 방향은?', '주차 계획 제안해줘'].map(q => (
                  <button key={q} onClick={() => setConsultQuestion(q)}
                    className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20">{q}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={consultQuestion} onChange={e => setConsultQuestion(e.target.value)}
                  placeholder="건축 설계에 대해 질문하세요..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleConsult()} />
                <button onClick={handleConsult} disabled={loading || !consultQuestion.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '💬'}
                </button>
              </div>
              {consultAnswer && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{consultAnswer}</div>
              )}
            </div>
          )}

          {/* 📝 제안서 */}
          {activeTab === 'proposal' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'proposal', label: '📄 투자 제안서', desc: '투자자용' },
                  { type: 'presentation', label: '📊 주민설명회', desc: '조합원용' },
                  { type: 'marketing', label: '📢 분양 카피', desc: '마케팅용' },
                ].map(t => (
                  <button key={t.type} onClick={() => handleProposal(t.type)} disabled={loading}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 text-[11px] font-medium">
                    <span>{t.label}</span>
                    <span className="text-[9px] opacity-60">{t.desc}</span>
                  </button>
                ))}
              </div>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> 제안서 작성 중...
                </div>
              )}
              {proposalContent && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">{proposalContent}</div>
              )}
            </div>
          )}

          {/* 📋 프롬프트 */}
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-400">🖼 Midjourney / DALL-E</span>
                  <button onClick={() => handleCopy(buildMidjourneyPrompt(input, selectedStyle), 'mj')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400">
                    {copiedType === 'mj' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedType === 'mj' ? '복사됨!' : '복사'}
                  </button>
                </div>
                <div className="bg-black/40 text-gray-300 text-[10px] p-2.5 rounded-lg font-mono leading-relaxed max-h-20 overflow-y-auto">
                  {buildMidjourneyPrompt(input, selectedStyle)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-400">💬 Claude / ChatGPT</span>
                  <button onClick={() => handleCopy(buildClaudePrompt(input, selectedStyle), 'cl')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400">
                    {copiedType === 'cl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedType === 'cl' ? '복사됨!' : '복사'}
                  </button>
                </div>
                <div className="bg-black/40 text-gray-300 text-[10px] p-2.5 rounded-lg font-mono leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                  {buildClaudePrompt(input, selectedStyle)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
