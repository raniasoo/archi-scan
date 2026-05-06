"use client"

import { useState } from "react"
import { Palette, MessageSquare, FileText, Loader2, X, Download } from "lucide-react"

interface AIActionPanelProps {
  address: string
  siteArea: number
  layoutName: string
  floors: number
  units: number
  coverage: number
  zoneType: string
  roi: number
  totalCost: number
  selectedStyle?: string
}

export function AIActionPanel(props: AIActionPanelProps) {
  const styleLabels: Record<string, string> = {
    'modern-luxury': '모던 럭셔리', 'eco-green': '친환경 녹색',
    'korean-modern': '한국 모던', 'minimalism': '미니멀리즘',
    'urban-complex': '도시 복합', 'premium-resi': '프리미엄 주거',
  }
  const [activeTab, setActiveTab] = useState<'render' | 'consult' | 'proposal' | null>(null)
  const [loading, setLoading] = useState(false)
  const [renderImage, setRenderImage] = useState<string | null>(null)
  const [consultAnswer, setConsultAnswer] = useState<string | null>(null)
  const [proposalContent, setProposalContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [consultQuestion, setConsultQuestion] = useState('')
  // 스타일은 전략에서 자동 결정

  const handleRender = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${props.layoutName} building design`,
          style: props.selectedStyle || 'modern-luxury',
          address: props.address,
          layoutName: props.layoutName,
          floors: props.floors,
          units: props.units,
          siteArea: props.siteArea,
        }),
      })
      const data = await res.json()
      if (data.success && data.image) {
        setRenderImage(data.image)
      } else {
        setError(data.error || data.details || '렌더링 생성 실패')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  const handleConsult = async () => {
    if (!consultQuestion.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: consultQuestion,
          context: {
            address: props.address,
            siteArea: props.siteArea,
            layoutName: props.layoutName,
            floors: props.floors,
            units: props.units,
            coverage: props.coverage,
            zoneType: props.zoneType,
            roi: props.roi,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setConsultAnswer(data.answer)
      } else {
        setError(data.error || '상담 실패')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  const handleProposal = async (type: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          context: {
            projectName: `${props.address} 개발사업`,
            address: props.address,
            siteArea: `${props.siteArea}㎡`,
            layoutName: props.layoutName,
            floors: `지상 ${props.floors}층`,
            units: `${props.units}세대`,
            coverage: `${props.coverage}%`,
            roi: `${props.roi.toFixed(1)}%`,
            totalCost: `${(props.totalCost / 100000000).toFixed(1)}억원`,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setProposalContent(data.content)
      } else {
        setError(data.error || '제안서 생성 실패')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">AI</div>
        <h3 className="text-sm font-bold">AI 직접 실행</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">3종 AI 연동</span>
      </div>

      {/* 3개 탭 버튼 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => setActiveTab(activeTab === 'render' ? null : 'render')}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all ${
            activeTab === 'render' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-card/30 border-border/50 text-muted-foreground hover:bg-card/60'
          }`}
        >
          <Palette className="h-5 w-5" />
          <span>🎨 렌더링</span>
          <span className="text-[9px] opacity-60">나노바나나</span>
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'consult' ? null : 'consult')}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all ${
            activeTab === 'consult' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-card/30 border-border/50 text-muted-foreground hover:bg-card/60'
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          <span>💬 설계상담</span>
          <span className="text-[9px] opacity-60">Claude</span>
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'proposal' ? null : 'proposal')}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all ${
            activeTab === 'proposal' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-card/30 border-border/50 text-muted-foreground hover:bg-card/60'
          }`}
        >
          <FileText className="h-5 w-5" />
          <span>📝 제안서</span>
          <span className="text-[9px] opacity-60">ChatGPT</span>
        </button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3 flex items-start gap-2">
          <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5 cursor-pointer" onClick={() => setError(null)} />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* 렌더링 탭 */}
      {activeTab === 'render' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">선택된 스타일:</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium">
              {styleLabels[props.selectedStyle || 'modern-luxury'] || props.selectedStyle || '모던 럭셔리'}
            </span>
          </div>

          <button onClick={handleRender} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />생성 중...</> : <>🎨 건축 렌더링 생성</>}
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

      {/* 설계상담 탭 */}
      {activeTab === 'consult' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {['이 배치안의 장단점은?', '규제 리스크는?', '설계 개선 방향은?'].map(q => (
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
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '💬'}
            </button>
          </div>
          {consultAnswer && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {consultAnswer}
            </div>
          )}
        </div>
      )}

      {/* 제안서 탭 */}
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
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {proposalContent}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
