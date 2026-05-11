"use client"

import { useState } from "react"
import { Sparkles, Copy, Check, Loader2, X, Download, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

interface ConceptInput {
  address: string; zoneType: string; zoneName: string; siteArea: number
  layoutName: string; floors: number; units: number
  buildingCoverageRatio: number; floorAreaRatio: number
  roi: number; totalProjectCost: number; strategy: string
  slope?: { grade: string; average: number; direction: string }
  buildingType?: string
  buildingCount?: number
  isMultiBuilding?: boolean
  values?: { profitVsQuality?: number; privacyVsCommunity?: number; efficiencyVsSpace?: number }
  patterns?: string[]
  surroundingContext?: string
  satelliteUrl?: string
  cadastralMapUrl?: string
  streetViewUrls?: string[]
  sitePolygon?: number[][]
  regulation?: { heightLimit?: number; farRatio?: number; zoneName?: string; northShadow?: boolean; northShadowAngle?: number; overlappingRegs?: string[] }
}

const STYLES = [
  { id: "modern-luxury", label: "모던 럭셔리", emoji: "🏢", prompt: "sleek modern luxury, glass curtain wall, premium finishes, high-end materials" },
  { id: "eco-green", label: "친환경 녹색", emoji: "🌿", prompt: "eco-friendly green building, vertical garden, rooftop greenery, sustainable materials, solar panels" },
  { id: "korean-modern", label: "한국 모던", emoji: "🏛", prompt: "korean contemporary architecture, hanok-inspired eaves, warm earth tones, modern reinterpretation of traditional Korean design" },
  { id: "minimalist", label: "미니멀리즘", emoji: "◻️", prompt: "minimalist architecture, clean white concrete surfaces, geometric forms, sharp lines" },
  { id: "urban-mixed", label: "도시 복합", emoji: "🌆", prompt: "urban mixed-use complex, street-level retail with glass storefronts, vibrant streetscape" },
  { id: "premium-resi", label: "프리미엄 주거", emoji: "🏠", prompt: "premium residential, deep terrace balconies, landscaped central courtyard, community amenities" },
  { id: "khanok-modern", label: "한옥 현대화", emoji: "🏯", prompt: "modern hanok reinterpretation, traditional Korean curved roof (기와) with contemporary glass and steel, exposed wood beams, inner courtyard (마당), stone base walls, sliding doors, harmony of old and new Korean architecture" },
  { id: "kvilla", label: "한국 빌라", emoji: "🏘️", prompt: "typical Korean multi-family villa (다세대주택), 3-4 story walk-up, pilotis ground floor parking, balcony with laundry areas, exterior staircase, flat roof with water tanks, realistic Korean residential neighborhood" },
  { id: "kapartment", label: "한국 아파트", emoji: "🏢", prompt: "Korean apartment complex (아파트 단지), uniform rectangular towers, numbered building signs, underground parking entrance, landscaped common area, children playground, walking paths between buildings" },
  { id: "kcommercial", label: "상가주택", emoji: "🏪", prompt: "Korean commercial-residential mixed building (상가주택), ground floor shops with signage and awnings, upper floors residential with balconies, narrow street frontage, typical Korean neighborhood commercial street" },
  { id: "kluxury", label: "고급 단독", emoji: "🏡", prompt: "Korean luxury detached house (고급 단독주택), natural stone and wood facade, private garden with mature trees, iron gate entrance, premium materials, quiet upscale residential neighborhood, Mercedes or BMW in driveway" },
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

const ANGLES = [
  { id: 'eye-level', label: '눈높이', emoji: '👁️' },
  { id: 'birds-eye', label: '조감도', emoji: '🦅' },
  { id: 'entrance', label: '입구', emoji: '🚪' },
]

const SCENES = [
  { id: 'afternoon', label: '오후', emoji: '☀️' },
  { id: 'golden', label: '황혼', emoji: '🌅' },
  { id: 'night', label: '야경', emoji: '🌙' },
  { id: 'spring', label: '봄', emoji: '🌸' },
  { id: 'summer', label: '여름', emoji: '🌿' },
  { id: 'winter', label: '겨울', emoji: '❄️' },
]

const MATERIALS = [
  { id: 'glass-curtain', label: '유리 커튼월', emoji: '🪟' },
  { id: 'exposed-concrete', label: '노출 콘크리트', emoji: '🧱' },
  { id: 'brick', label: '벽돌', emoji: '🏠' },
  { id: 'stone', label: '석재', emoji: '🪨' },
  { id: 'metal-panel', label: '금속 패널', emoji: '🔩' },
  { id: 'wood-louver', label: '목재 루버', emoji: '🪵' },
  { id: 'stucco', label: '스타코', emoji: '⬜' },
  { id: 'composite', label: '복합 재질', emoji: '🎨' },
]

// ━━━ 대지 특성 기반 AI 자동 최적화 ━━━
function getOptimalSettings(input: ConceptInput): { style: string; angle: string; scene: string; material: string | null; reason: string } {
  const addr = String(input.address || '')
  const zone = String(input.zoneType || '')
  const strat = String(input.strategy || '')
  const floors = input.floors || 3
  const regs = (input.regulation?.overlappingRegs || []).map((r: any) => typeof r === 'string' ? r : (r?.name || String(r || '')))
  const hasNatureReg = regs.some((r: string) => r.includes('경관') || r.includes('자연') || r.includes('녹지'))
  const hasHistoricReg = regs.some((r: string) => r.includes('문화') || r.includes('한옥') || r.includes('역사'))

  // ━━━ 스타일 자동 선택 ━━━
  let style = 'modern-luxury'
  let reason = ''

  if (hasHistoricReg || addr.includes('북촌') || addr.includes('서촌') || addr.includes('인사동')) {
    style = 'korean-modern'; reason = '역사·문화 지역 → 한국 모던'
  } else if (hasNatureReg || addr.includes('평창') || addr.includes('부암') || addr.includes('성북')) {
    style = 'premium-resi'; reason = '자연경관·고급 주택가 → 프리미엄 주거'
  } else if (zone.includes('commercial') || addr.includes('강남') || addr.includes('서초') || addr.includes('여의도')) {
    style = 'modern-luxury'; reason = '상업·도심 지역 → 모던 럭셔리'
  } else if (strat === 'livability') {
    style = 'eco-green'; reason = '실거주 전략 → 친환경 녹색'
  } else if (strat === 'privacy-priority') {
    style = 'premium-resi'; reason = '프라이버시 전략 → 프리미엄 주거'
  } else if (strat === 'profitability' && zone.includes('residential')) {
    style = 'minimalist'; reason = '수익성 + 주거 → 미니멀리즘'
  } else if (floors <= 3) {
    style = 'premium-resi'; reason = '저층 주거 → 프리미엄 주거'
  }

  // ━━━ 카메라 자동 선택 ━━━
  let angle = 'eye-level'
  if (floors >= 10) angle = 'birds-eye'
  else if (input.isMultiBuilding || input.buildingType === 'cluster') angle = 'birds-eye'

  // ━━━ 장면 자동 선택 ━━━
  let scene = 'afternoon'
  if (strat === 'view-priority' || strat === 'privacy-priority') scene = 'golden'
  else if (zone.includes('commercial')) scene = 'afternoon'
  else if (strat === 'livability') scene = 'spring'

  // ━━━ 재질 자동 선택 ━━━
  let material: string | null = null // null = 자동
  if (hasNatureReg) material = 'wood-louver'
  else if (addr.includes('평창') || addr.includes('성북') || addr.includes('한남')) material = 'stone'
  else if (zone.includes('commercial')) material = 'glass-curtain'
  else if (strat === 'livability') material = 'brick'
  else if (strat === 'profitability') material = 'composite'

  return { style, angle, scene, material, reason }
}

export function AIHub({ input, onRenderComplete, previousRenderImage, savedMultiImages, onMultiImagesComplete }: { input: ConceptInput; onRenderComplete?: (imageData: string) => void; previousRenderImage?: string | null; savedMultiImages?: {angle:string; image:string|null}[] | null; onMultiImagesComplete?: (images: {angle:string; image:string|null}[]) => void }) {
  let optimal = { style: 'modern-luxury', angle: 'eye-level', scene: 'afternoon', material: null as string | null, reason: '' }
  try { optimal = getOptimalSettings(input) } catch (e) { console.warn('[AIHub] getOptimalSettings error:', e) }
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'render'|'consult'|'proposal'|'prompt'>('render')
  const [style, setStyle] = useState(optimal.style)
  const [angle, setAngle] = useState(optimal.angle)
  const [scene, setScene] = useState(optimal.scene)
  const [materialId, setMaterialId] = useState<string | null>(optimal.material)
  const [showStyleOptions, setShowStyleOptions] = useState(false)
  const [multiImages, setMultiImages] = useState<{angle:string; image:string|null}[] | null>(savedMultiImages || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [copied, setCopied] = useState<string|null>(null)
  const [renderImg, setRenderImg] = useState<string|null>(previousRenderImage || null)
  const [useReference, setUseReference] = useState(!!previousRenderImage)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string|null>(null)
  const [proposal, setProposal] = useState<string|null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const styleName = STYLES.find(s => s.id === style)?.label || '모던 럭셔리'

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text) } catch { const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t) }
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  // #5: 재시도 로직 + Gemini/Flux 엔진 라우팅
  const doRender = async (retry = 0) => {
    setLoading(true); setError(null); setRetryCount(retry); setMultiImages(null)

    try {
      const r = await fetch('/api/ai-render', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        prompt:`${input.layoutName} ${input.floors}층 ${input.units}세대`,
        style, address:input.address, layoutName:input.layoutName,
        floors:input.floors, units:input.units, siteArea:input.siteArea,
        buildingType:input.buildingType, buildingCount:input.buildingCount, coverage:input.buildingCoverageRatio,
        strategy:input.strategy, values:input.values, patterns:input.patterns,
        surroundingContext:input.surroundingContext,
        cameraAngle: angle, sceneMode: scene,
        satelliteUrl: input.satelliteUrl,
        cadastralMapUrl: input.cadastralMapUrl,
        streetViewUrls: input.streetViewUrls,
        sitePolygon: input.sitePolygon,
        material: materialId ? { type: materialId } : undefined,
        regulation: input.regulation,
        referenceImage: useReference && previousRenderImage ? previousRenderImage : undefined,
      }) })
      const d = await r.json()
      if (d.success && d.image) {
        setRenderImg(d.image); onRenderComplete?.(d.image); setRetryCount(0)
      } else if (retry < 2) {
        // 재시도 (최대 2회)
        await new Promise(r => setTimeout(r, 1500))
        return doRender(retry + 1)
      } else {
        setError(d.error||'렌더링 실패'); setRetryCount(0)
      }
    } catch(e) {
      if (retry < 2) {
        await new Promise(r => setTimeout(r, 1500))
        return doRender(retry + 1)
      }
      setError(e instanceof Error ? e.message : '오류'); setRetryCount(0)
    } finally { setLoading(false) }
  }

  // #9: 멀티앵글 일괄 생성
  const doMultiRender = async () => {
    setLoading(true); setError(null); setMultiImages(null)
    try {
      const r = await fetch('/api/ai-render', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
        prompt:`${input.layoutName} ${input.floors}층 ${input.units}세대`,
        style, address:input.address, layoutName:input.layoutName,
        floors:input.floors, units:input.units, siteArea:input.siteArea,
        buildingType:input.buildingType, buildingCount:input.buildingCount, coverage:input.buildingCoverageRatio,
        strategy:input.strategy, values:input.values, patterns:input.patterns,
        surroundingContext:input.surroundingContext, sceneMode: scene,
        satelliteUrl: input.satelliteUrl,
        cadastralMapUrl: input.cadastralMapUrl,
        streetViewUrls: input.streetViewUrls,
        sitePolygon: input.sitePolygon,
        material: materialId ? { type: materialId } : undefined,
        regulation: input.regulation,
        multiAngle: true,
      }) })
      const d = await r.json()
      if (d.success && d.images) {
        setMultiImages(d.images)
        onMultiImagesComplete?.(d.images)
        const first = d.images.find((i: any) => i.image)
        if (first) onRenderComplete?.(first.image)
      } else setError(d.error || '멀티앵글 생성 실패')
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
          {/* AI 자동 추천 설정 요약 */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary">AI 자동 추천 설정</span>
              {optimal.reason && <span className="text-[9px] text-muted-foreground ml-auto">{optimal.reason}</span>}
            </div>
            <div className="flex gap-2 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">{STYLES.find(s => s.id === style)?.emoji} {STYLES.find(s => s.id === style)?.label}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{ANGLES.find(a => a.id === angle)?.emoji} {ANGLES.find(a => a.id === angle)?.label}</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{SCENES.find(s => s.id === scene)?.emoji} {SCENES.find(s => s.id === scene)?.label}</span>
              {materialId && <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300">{MATERIALS.find(m => m.id === materialId)?.emoji} {MATERIALS.find(m => m.id === materialId)?.label}</span>}
            </div>
          </div>

          {/* 스타일 변경 (접기/펼치기) */}
          <button onClick={() => setShowStyleOptions(!showStyleOptions)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={`h-3 w-3 transition-transform ${showStyleOptions ? 'rotate-180' : ''}`} />
            스타일 직접 변경
          </button>

          {showStyleOptions && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {STYLES.slice(0, 6).map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`p-1.5 rounded-lg text-center text-[10px] transition-all ${style === s.id ? 'bg-violet-500/20 border-2 border-violet-400 font-semibold' : 'bg-card/30 border border-border/50 hover:border-violet-300'}`}>
                    <span className="text-base block">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-amber-400/70 font-medium">🇰🇷 한국 건축 스타일</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {STYLES.slice(6).map(s => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`p-1.5 rounded-lg text-center text-[10px] transition-all ${style === s.id ? 'bg-amber-500/20 border-2 border-amber-400 font-semibold' : 'bg-card/30 border border-amber-900/30 hover:border-amber-400'}`}>
                      <span className="text-base block">{s.emoji}</span>{s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
            {/* 카메라/장면/재질 — 스타일 변경 열렸을 때만 */}
            {showStyleOptions && (
              <div className="space-y-2 border-t border-border/30 pt-2">
                <p className="text-[10px] text-muted-foreground font-medium">카메라 · 장면 · 재질</p>
                {/* #4: 카메라 앵글 */}
                <div className="flex gap-1">
                  {ANGLES.map(a => (
                    <button key={a.id} onClick={() => setAngle(a.id)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] text-center transition-all ${angle === a.id ? 'bg-blue-500/20 border border-blue-400 font-semibold text-blue-300' : 'bg-card/20 border border-border/30 text-muted-foreground'}`}>
                      {a.emoji} {a.label}
                    </button>
                  ))}
                </div>
                {/* #6: 계절/시간대 */}
                <div className="flex gap-1 flex-wrap">
                  {SCENES.map(s => (
                    <button key={s.id} onClick={() => setScene(s.id)}
                      className={`px-2 py-1 rounded-full text-[10px] transition-all ${scene === s.id ? 'bg-amber-500/20 border border-amber-400 font-semibold text-amber-300' : 'bg-card/20 border border-border/30 text-muted-foreground'}`}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
            {/* #8: 재질/색상 선택 */}
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setMaterialId(null)}
                className={`px-2 py-1 rounded-full text-[10px] transition-all ${!materialId ? 'bg-emerald-500/20 border border-emerald-400 font-semibold text-emerald-300' : 'bg-card/20 border border-border/30 text-muted-foreground'}`}>
                🏗️ 자동
              </button>
              {MATERIALS.map(m => (
                <button key={m.id} onClick={() => setMaterialId(m.id)}
                  className={`px-2 py-1 rounded-full text-[10px] transition-all ${materialId === m.id ? 'bg-purple-500/20 border border-purple-400 font-semibold text-purple-300' : 'bg-card/20 border border-border/30 text-muted-foreground'}`}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
              </div>
            )}
            {/* 이전 렌더링 — 사용/참조/새로 생성 */}
            {previousRenderImage && !renderImg && !multiImages && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-300">✨ AI 렌더링 결과</span>
                  <span className="text-[9px] text-muted-foreground">QuickAnalysis</span>
                </div>
                <img src={previousRenderImage} alt="AI 렌더링" className="w-full rounded-lg border border-emerald-500/30" />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setRenderImg(previousRenderImage); onRenderComplete?.(previousRenderImage); toast.success('렌더링 이미지를 사용합니다') }}
                    className="flex-1 py-2 rounded-lg bg-emerald-600/80 text-white text-[11px] font-semibold"
                  >
                    ✅ 이 렌더링 사용
                  </button>
                  <button
                    onClick={() => { setUseReference(true); doRender(0) }}
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg bg-violet-600/80 text-white text-[11px] font-semibold disabled:opacity-50"
                  >
                    🔄 스타일 유지 재생성
                  </button>
                </div>
                <button
                  onClick={() => setUseReference(!useReference)}
                  className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    useReference 
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                      : 'bg-muted/30 text-muted-foreground border border-border/30'
                  }`}
                >
                  {useReference ? '📷 참조 ON — 유사 스타일로 생성' : '📷 참조 OFF — 완전히 새로 생성'}
                </button>
              </div>
            )}
            {/* 렌더링 버튼 (항상 보임) */}
            <div className="flex gap-2">
              <button onClick={() => doRender(0)} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && !multiImages ? <><Loader2 className="h-4 w-4 animate-spin" />{retryCount > 0 ? `재시도 ${retryCount}/2` : '생성 중'}</> : '🎨 렌더링'}
              </button>
              <button onClick={doMultiRender} disabled={loading} className="py-2.5 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1" title="정면+조감+입구 3장">
                {loading && multiImages !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : '📐 3장'}
              </button>
            </div>
            {/* #7: 위성사진 참조 표시 */}
            {(input.satelliteUrl || input.cadastralMapUrl) && <p className="text-[9px] text-emerald-400/60 text-center">🛰️ 위성사진 + 지적도가 AI 참조 이미지로 전달됩니다</p>}
            {/* 단일 렌더링 결과 */}
            {renderImg && !multiImages && <div className="space-y-2"><img src={renderImg} alt="렌더링" className="w-full rounded-lg border border-border" /><a href={renderImg} download={`render-${Date.now()}.png`} onClick={() => toast.success('렌더링 이미지 다운로드 시작')} className="flex items-center justify-center gap-1 text-xs text-emerald-400"><Download className="h-3 w-3" />다운로드</a></div>}
            {/* #9: 멀티앵글 결과 */}
            {multiImages && <div className="space-y-2">
              <p className="text-[10px] text-violet-400 font-medium text-center">📐 멀티앵글 ({multiImages.filter(i => i.image).length}/3장 성공)</p>
              {multiImages.map((mi, idx) => mi.image && (
                <div key={idx} className="space-y-1">
                  <p className="text-[9px] text-muted-foreground font-medium">
                    {mi.angle === 'eye-level' ? '👁️ 정면 · 보행자 시점 (1.6m)' : mi.angle === 'birds-eye' ? '🦅 조감도 · 드론 시점 (50m)' : '🚪 입구 · 클로즈업 (3m)'}
                  </p>
                  <img src={mi.image} alt={mi.angle} className="w-full rounded-lg border border-border" />
                </div>
              ))}
              <div className="flex gap-1">
                {multiImages.filter(i => i.image).map((mi, idx) => (
                  <a key={idx} href={mi.image!} download={`render-${mi.angle}-${Date.now()}.png`} onClick={() => toast.success('렌더링 이미지 다운로드 시작')} className="flex-1 text-center text-[10px] text-violet-400 py-1 rounded bg-violet-500/10 border border-violet-500/20">
                    <Download className="h-3 w-3 inline" /> {mi.angle === 'eye-level' ? '정면' : mi.angle === 'birds-eye' ? '조감' : '입구'}
                  </a>
                ))}
              </div>
            </div>}
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
