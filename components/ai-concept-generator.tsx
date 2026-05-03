"use client"

import { useState } from "react"
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, Wand2, Image, MessageSquare } from "lucide-react"

interface ConceptInput {
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
  slope?: { grade: string; average: number; direction: string }
}

const STYLE_PRESETS = [
  { id: "modern-luxury", label: "모던 럭셔리", emoji: "🏢", prompt: "sleek modern luxury, glass curtain wall, premium finishes, night lighting" },
  { id: "eco-green", label: "친환경 녹색", emoji: "🌿", prompt: "eco-friendly green building, vertical garden, rooftop greenery, sustainable materials" },
  { id: "korean-modern", label: "한국 모던", emoji: "🏛", prompt: "korean contemporary architecture, hanok-inspired curves, natural materials, warm tones" },
  { id: "minimalist", label: "미니멀리즘", emoji: "◻️", prompt: "minimalist architecture, clean white surfaces, geometric forms, natural light" },
  { id: "urban-mixed", label: "도시 복합", emoji: "🌆", prompt: "urban mixed-use complex, street-level retail, podium tower, vibrant streetscape" },
  { id: "premium-resi", label: "프리미엄 주거", emoji: "🏠", prompt: "premium residential tower, terrace balconies, landscaped courtyard, community amenities" },
]

function generateMidjourneyPrompt(input: ConceptInput, styleId: string): string {
  const style = STYLE_PRESETS.find(s => s.id === styleId)
  if (!style) return ""

  const zoneDesc = input.zoneName || "urban zone"
  const floorDesc = input.floors <= 5 ? "low-rise" : input.floors <= 15 ? "mid-rise" : "high-rise"
  const scaleDesc = input.siteArea > 1000 ? "large-scale" : input.siteArea > 500 ? "medium-scale" : "compact"

  const slopeDesc = input.slope && input.slope.average > 8
    ? ", built on sloped terrain with stepped massing"
    : input.slope && input.slope.average > 3
    ? ", gentle slope with split-level design"
    : ""

  const strategyDesc =
    input.strategy === "area-maximize" ? "maximum floor area efficiency, dense layout" :
    input.strategy === "view-priority" ? "panoramic view oriented, open facade" :
    input.strategy === "profitability" ? "profit-optimized commercial mixed-use" :
    input.strategy === "livability" ? "livability focused, courtyard and greenery" :
    input.strategy === "parking-efficient" ? "efficient parking layout, practical design" :
    "balanced architectural approach"

  return `${scaleDesc} ${floorDesc} ${input.layoutName} building in Seoul South Korea, ${zoneDesc}, ${input.floors} floors, ${strategyDesc}${slopeDesc}, ${style.prompt}, architectural exterior rendering, photorealistic, golden hour lighting, 4K, professional architectural photography --ar 16:9 --v 6.1`
}

function generateClaudePrompt(input: ConceptInput, styleId: string): string {
  const style = STYLE_PRESETS.find(s => s.id === styleId)
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
- ROI: ${input.roi}%
${input.slope ? `- 경사도: ${input.slope.grade} (${input.slope.average}%, ${input.slope.direction}방향)` : ""}

## 디자인 방향
- 스타일: ${style.label}
- 키워드: ${style.prompt}

## 요청사항
1. 건축 매스(Mass) 컨셉: 형태적 특징과 배치 전략
2. 파사드 디자인: 재료, 패턴, 색상
3. 외부 공간: 조경, 진입 동선, 주차 계획
4. 차별화 포인트: 이 프로젝트만의 고유한 건축적 가치
5. 참고 사례: 유사한 규모/용도의 국내외 우수 사례 2~3개`
}

export function AIConceptGenerator({ input }: { input: ConceptInput }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState("modern-luxury")
  const [copiedType, setCopiedType] = useState<string | null>(null)

  const midjourneyPrompt = generateMidjourneyPrompt(input, selectedStyle)
  const claudePrompt = generateClaudePrompt(input, selectedStyle)

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    } catch {
      // fallback
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    }
  }

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/30 dark:to-blue-950/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">AI 건축 컨셉 프롬프트</h3>
            <p className="text-xs text-muted-foreground">Midjourney · ChatGPT · Claude용 프롬프트 자동 생성</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* 스타일 선택 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">디자인 스타일 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_PRESETS.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-2 rounded-lg text-center text-xs transition-all ${
                    selectedStyle === style.id
                      ? "bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-400 dark:border-purple-600 font-semibold"
                      : "bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-purple-300"
                  }`}
                >
                  <span className="text-lg block mb-0.5">{style.emoji}</span>
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Midjourney 프롬프트 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-semibold">Midjourney / DALL-E 프롬프트</span>
              </div>
              <button
                onClick={() => handleCopy(midjourneyPrompt, "midjourney")}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors"
              >
                {copiedType === "midjourney" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copiedType === "midjourney" ? "복사됨!" : "복사"}
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg font-mono leading-relaxed max-h-24 overflow-y-auto">
              {midjourneyPrompt}
            </div>
          </div>

          {/* Claude/ChatGPT 프롬프트 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold">Claude / ChatGPT 프롬프트</span>
              </div>
              <button
                onClick={() => handleCopy(claudePrompt, "claude")}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              >
                {copiedType === "claude" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copiedType === "claude" ? "복사됨!" : "복사"}
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
              {claudePrompt}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            프롬프트를 복사하여 Midjourney, ChatGPT, Claude 등에 붙여넣기 하세요
          </p>
        </div>
      )}
    </div>
  )
}
