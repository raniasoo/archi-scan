"use client"

import { useState } from "react"
import { Sparkles, Copy, Check, Loader2, X, Download, ChevronDown, ChevronUp } from "lucide-react"

interface ConceptInput {
  address: string; zoneType: string; zoneName: string; siteArea: number
  layoutName: string; floors: number; units: number
  buildingCoverageRatio: number; floorAreaRatio: number
  roi: number; totalProjectCost: number; strategy: string
  slope?: { grade: string; average: number; direction: string }
}

const STYLES = [
  { id: "modern-luxury", label: "모던 럭셔리", emoji: "🏢", prompt: "sleek modern luxury, glass curtain wall, premium finishes" },
  { id: "eco-green", label: "친환경 녹색", emoji: "🌿", prompt: "eco-friendly green building, vertical garden, sustainable materials" },
  { id: "korean-modern", label: "한국 모던", emoji: "🏛", prompt: "korean contemporary architecture, hanok-inspired, warm tones" },
  { id: "minimalist", label: "미니멀리즘", emoji: "◻️", prompt: "minimalist architecture, clean white surfaces, geometric forms" },
  { id: "urban-mixed", label: "도시 복합", emoji: "🌆", prompt: "urban mixed-use complex, street-level retail, vibrant streetscape" },
  { id: "premium-resi", label: "프리미엄 주거", emoji: "🏠", prompt: "premium residential, terrace balconies, landscaped courtyard" },
]

function genMJ(input: ConceptInput, styleId: string): string {
  const s = STYLES.find(x => x.id === styleId)
  if (!s) return ""
  const fl = input.floors <= 5 ? "low-rise" : input.floors <= 15 ? "mid-rise" : "high-rise"
  const sc = input.siteArea > 1000 ? "large-scale" : "medium-scale"
  return `${sc} ${fl} ${input.layoutName} building in Seoul, ${input.zoneName}, ${input.floors} floors, ${s.prompt}, architectural rendering, photorealistic, golden hour, 4K --ar 16:9 --v 6.1`
}

function genCL(input: ConceptInput, styleId: string): string {
  const s = STYLES.find(x => x.id === styleId)
  if (!s) return ""
  return `당신은 건축설계 전문가입니다. 아래 조건으로 건축 컨셉 디자인을 제안해주세요.

## 프로젝트 조건
- 위치: ${input.address}
- 용도지역: ${input.zoneName}
- 대지면적: ${input.siteArea.toLocaleString()}㎡
- 배치 유형: ${input.layoutName}
- 규모: 지상 ${input.floors}층, ${input.units}세대
- 건폐율: ${input.buildingCoverageRatio}% / 용적률: ${input.floorAreaRatio}%
- 총사업비: ${(input.totalProjectCost / 100000000).toFixed(1)}억원

## 디자인: ${s.label}
## 요청: 매스 컨셉, 파사드, 외부 공간, 차별화 포인트, 참고 사례`
}

export function AIHub({ input, onRenderComplete }: { input: ConceptInput; onRenderComplete?: (imageData: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'render'|'consult'|'proposal'|'prompt'>('render')
  const [style, setStyle] = useState('modern-luxury')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [copied, setCopied] = useState<string|null>(null)
  const [renderImg, setRenderImg] = useState<string|null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string|null>(null)
  const [proposal, setProposal] = useState<string|null>(null)

  const styleName = STYLES.find(s => s.id === style)?.label || '모던 럭셔리'

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text) } catch { const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t) }
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  const doRender = async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/ai-render', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt:`${input.layoutName}`, style, address:input.address, layoutName:input.layoutName, floors:input.floors, units:input.units, siteArea:input.siteArea }) })
      const d = await r.json()
      if (d.success && d.image) { setRenderImg(d.image); onRenderComplete?.(d.image) } else setError(d.error||'렌더링 실패')
    } catch(e) { setError(e instanceof Error ? e.message : '오류') } finally { setLoading(false) }
  }

  const doConsult = async () => {
    if (!question.trim()) return; setLoading(true); setError(null)
    try {
      const r = await fetch('/api/ai-consult', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ question, context:{ address:input.address, siteArea:input.siteArea, layoutName:input.layoutName, floors:input.floors, units:input.units, coverage:input.buildingCoverageRatio, zoneType:input.zoneType, roi:input.roi }}) })
      const d = await r.json()
      if (d.success) setAnswer(d.answer); else setError(d.error||'상담 실패')
    } catch(e) { setError(e instanceof Error ? e.message : '오류') } finally { setLoading(false) }
  }

  const doProposal = async (type: string) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/ai-proposal', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ type, context:{ projectName:`${input.address} 개발사업`, address:input.address, siteArea:`${input.siteArea}㎡`, layoutName:input.layoutName, floors:`지상 ${input.floors}층`, units:`${input.units}세대`, coverage:`${input.buildingCoverageRatio}%`, roi:`${input.roi.toFixed(1)}%`, totalCost:`${(input.totalProjectCost/100000000).toFixed(1)}억원` }}) })
      const d = await r.json()
      if (d.success) setProposal(d.content); else setError(d.error||'제안서 실패')
    } catch(e) { setError(e instanceof Error ? e.message : '오류') } finally { setLoading(false) }
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-blue-500/5 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 hover:bg-violet-500/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
          <div className="text-left">
            <h3 className="font-bold text-sm">🤖 AI 허브</h3>
            <p className="text-[10px] text-muted-foreground">렌더링 · 설계상담 · 제안서 · 프롬프트</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* 스타일 선택 */}
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                className={`p-1.5 rounded-lg text-center text-[10px] transition-all ${style === s.id ? 'bg-violet-500/20 border-2 border-violet-400 font-semibold' : 'bg-card/30 border border-border/50 hover:border-violet-300'}`}>
                <span className="text-base block">{s.emoji}</span>{s.label}
              </button>
            ))}
          </div>

          {/* 탭 */}
          <div className="grid grid-cols-4 gap-1">
            {([['render','🎨','렌더링'],['consult','💬','상담'],['proposal','📝','제안서'],['prompt','📋','프롬프트']] as const).map(([id,emoji,label]) => (
              <button key={id} onClick={() => setTab(id as any)}
                className={`py-2 rounded-lg text-[10px] font-medium transition-all ${tab===id ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'bg-card/20 border border-border/30 text-muted-foreground'}`}>
                {emoji} {label}
              </button>
            ))}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-start gap-2"><X className="h-3.5 w-3.5 text-red-400 shrink-0 cursor-pointer" onClick={() => setError(null)} /><p className="text-[10px] text-red-400">{error}</p></div>}

          {/* 렌더링 */}
          {tab === 'render' && <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">스타일: <span className="text-emerald-400 font-medium">{styleName}</span></p>
            <button onClick={doRender} disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />생성 중...</> : '🎨 건축 렌더링 생성'}
            </button>
            {renderImg && <div className="space-y-2"><img src={renderImg} alt="렌더링" className="w-full rounded-lg border border-border" /><a href={renderImg} download={`render-${Date.now()}.png`} className="flex items-center justify-center gap-1 text-xs text-emerald-400"><Download className="h-3 w-3" />다운로드</a></div>}
          </div>}

          {/* 상담 */}
          {tab === 'consult' && <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {['장단점 분석','규제 리스크','개선 방향'].map(q => <button key={q} onClick={() => setQuestion(q+'?')} className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">{q}</button>)}
            </div>
            <div className="flex gap-2">
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="질문하세요..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" onKeyDown={e => e.key==='Enter' && doConsult()} />
              <button onClick={doConsult} disabled={loading||!question.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '💬'}</button>
            </div>
            {answer && <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{answer}</div>}
          </div>}

          {/* 제안서 */}
          {tab === 'proposal' && <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {[{t:'proposal',l:'📄 투자용'},{t:'presentation',l:'📊 설명회용'},{t:'marketing',l:'📢 마케팅용'}].map(x => <button key={x.t} onClick={() => doProposal(x.t)} disabled={loading} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium disabled:opacity-50">{x.l}</button>)}
            </div>
            {loading && <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />작성 중...</div>}
            {proposal && <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">{proposal}</div>}
          </div>}

          {/* 프롬프트 */}
          {tab === 'prompt' && <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-purple-400">🖼 Midjourney / DALL-E</span>
                <button onClick={() => copy(genMJ(input, style), 'mj')} className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1">{copied==='mj' ? <><Check className="h-3 w-3" />복사됨</> : <><Copy className="h-3 w-3" />복사</>}</button>
              </div>
              <pre className="bg-card/50 border border-border/50 rounded-lg p-2.5 text-[10px] whitespace-pre-wrap max-h-24 overflow-y-auto">{genMJ(input, style)}</pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-blue-400">💬 Claude / ChatGPT</span>
                <button onClick={() => copy(genCL(input, style), 'cl')} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">{copied==='cl' ? <><Check className="h-3 w-3" />복사됨</> : <><Copy className="h-3 w-3" />복사</>}</button>
              </div>
              <pre className="bg-card/50 border border-border/50 rounded-lg p-2.5 text-[10px] whitespace-pre-wrap max-h-24 overflow-y-auto">{genCL(input, style)}</pre>
            </div>
          </div>}
        </div>
      )}
    </div>
  )
}
