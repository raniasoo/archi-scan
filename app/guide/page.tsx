"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Building2, MapPin, Scale, LayoutGrid, Ruler, Sparkles, DollarSign, FileText,
  ChevronDown, ChevronRight, Zap, ArrowRight, HelpCircle, BookOpen, Lightbulb,
  Search, CheckCircle2, Clock, MousePointerClick
} from "lucide-react"

/* ── Accordion ── */
function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{children}</div>}
    </div>
  )
}

/* ── Step Card ── */
function StepCard({ num, icon: Icon, title, desc }: { num: number; icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">STEP {num}</span>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

/* ── Tip Box ── */
function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mt-4">
      <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string>("quick")

  const sections = [
    { id: "quick", label: "빠른 분석", icon: Zap },
    { id: "detailed", label: "상세 분석", icon: BookOpen },
    { id: "tips", label: "활용 팁", icon: Lightbulb },
    { id: "faq", label: "자주 묻는 질문", icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Archi-Scan</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            앱으로 돌아가기 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 pb-20">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold rounded-full px-3 py-1 mb-3">
            <BookOpen className="h-3.5 w-3.5" />
            사용 가이드
          </div>
          <h1 className="text-2xl font-bold mb-2">Archi-Scan 사용법</h1>
          <p className="text-sm text-muted-foreground">주소 입력부터 사업성 보고서까지, 단계별로 안내합니다</p>
        </div>

        {/* Section Nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeSection === s.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        {/* ══════════ 빠른 분석 (QuickAnalysis) ══════════ */}
        {activeSection === "quick" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">빠른 분석</h2>
                  <p className="text-xs text-muted-foreground">3단계로 즉시 사업성 확인</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Clock className="h-3.5 w-3.5" />
                <span>예상 소요 시간: <strong className="text-foreground">약 1~2분</strong></span>
              </div>
            </div>

            <div className="space-y-5">
              <StepCard
                num={1}
                icon={MapPin}
                title="주소 입력"
                desc="대상지 주소를 입력합니다. 도로명 주소나 지번 주소 모두 가능합니다. '국토부 자동조회' 버튼을 누르면 대지면적, 용도지역 등이 자동으로 채워집니다."
              />
              <StepCard
                num={2}
                icon={Building2}
                title="프로젝트 유형 선택"
                desc="공동주택, 다세대, 오피스텔, 근린생활시설 등 건축 용도를 선택합니다. 유형에 따라 법규 기준과 배치 전략이 달라집니다."
              />
              <StepCard
                num={3}
                icon={MousePointerClick}
                title="'사업성 분석하기' 클릭"
                desc="AI가 자동으로 법규 검토, 건폐율·용적률 계산, 배치안 생성, ROI 분석을 수행합니다. 결과가 요약 카드로 즉시 표시됩니다."
              />
            </div>

            <TipBox>
              <strong>빠른 분석 결과 카드</strong>에서 '상세 분석 보기'를 누르면 7단계 상세 분석 모드로 전환할 수 있습니다. 빠른 분석은 대략적인 사업성 판단에 적합하고, 투자 의사결정이나 사업계획서 작성에는 상세 분석을 추천합니다.
            </TipBox>
          </div>
        )}

        {/* ══════════ 상세 분석 7단계 ══════════ */}
        {activeSection === "detailed" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">상세 분석 7단계</h2>
                  <p className="text-xs text-muted-foreground">전문가 수준의 사전기획 분석</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>예상 소요 시간: <strong className="text-foreground">약 5~10분</strong></span>
              </div>
            </div>

            <div className="space-y-5">
              <StepCard
                num={1}
                icon={MapPin}
                title="대상지 정보 입력"
                desc="주소, 대지면적, 용도지역, 프로젝트 유형을 입력합니다. 국토부 자동조회로 건축물대장 정보를 불러올 수 있고, 위성사진과 로드뷰도 확인 가능합니다."
              />
              <StepCard
                num={2}
                icon={Search}
                title="설계 전략 선택"
                desc="면적 최대화, 수익성 극대화, 주차 최적화 등 설계 방향을 선택합니다. 전략에 따라 배치안과 규모 산정이 달라집니다."
              />
              <StepCard
                num={3}
                icon={Scale}
                title="법규 검토"
                desc="건폐율, 용적률, 높이제한, 일조권, 인접대지 이격거리 등 관련 법규를 자동으로 검토합니다. 위반 항목이 있으면 빨간색으로 표시됩니다."
              />
              <StepCard
                num={4}
                icon={LayoutGrid}
                title="배치안 생성"
                desc="AI가 법규를 준수하는 최적의 건물 배치안을 여러 개 생성합니다. 각 배치안의 세대수, 전용면적, 주차대수 등을 비교할 수 있습니다."
              />
              <StepCard
                num={5}
                icon={Ruler}
                title="도면 & AI 렌더링"
                desc="선택한 배치안의 평면도, 입면도, 단면도, 아이소메트릭 뷰를 생성합니다. AI 렌더링으로 실제 건물 모습의 포토리얼리스틱 이미지도 만들 수 있습니다."
              />
              <StepCard
                num={6}
                icon={DollarSign}
                title="사업성 검토"
                desc="공사비, 토지비, 금융비용 등 총 사업비를 산출하고 분양수입 대비 ROI, 손익분기 분양률, 사업 기간별 현금흐름을 분석합니다."
              />
              <StepCard
                num={7}
                icon={FileText}
                title="보고서 생성"
                desc="지금까지의 분석 결과를 전문적인 PDF 보고서로 생성합니다. 보고서에는 대지 분석, 법규 검토, 배치안, 사업성 분석, AI 렌더링 이미지가 모두 포함됩니다."
              />
            </div>

            <TipBox>
              상세 분석은 각 단계를 건너뛸 수 없습니다. 이전 단계의 결과가 다음 단계의 입력이 되기 때문입니다. 단, 이전 단계로 돌아가서 수정하면 이후 단계는 자동으로 갱신 대상으로 표시됩니다.
            </TipBox>
          </div>
        )}

        {/* ══════════ 활용 팁 ══════════ */}
        {activeSection === "tips" && (
          <div className="space-y-4">
            <Accordion title="🎨 AI 렌더링 활용법" defaultOpen>
              <p className="mb-3">AI 렌더링은 <strong>눈높이(Eye-level)</strong>와 <strong>조감도(Bird&apos;s-eye)</strong> 두 가지 시점을 지원합니다.</p>
              <ul className="space-y-2">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>눈높이 렌더링은 스트리트뷰 사진을 참고하여 주변 환경과 어울리는 이미지를 생성합니다.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>조감도 렌더링은 위성 사진을 참고하여 전체 배치를 한눈에 볼 수 있는 이미지를 만듭니다.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>두 번째 렌더링부터는 첫 번째 이미지를 참고하여 건물 디자인의 일관성을 유지합니다.</span></li>
              </ul>
            </Accordion>

            <Accordion title="📊 사업성 분석 읽는 법">
              <ul className="space-y-2">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>ROI (투자수익률)</strong>: 총 투자비 대비 수익 비율. 15% 이상이면 양호, 25% 이상이면 우수합니다.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>손익분기 분양률</strong>: 이 비율 이상 분양되면 손실이 없습니다. 80% 이하가 안전 기준입니다.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>총 사업비</strong>: 토지비 + 공사비 + 설계비 + 금융비용 + 기타 경비의 합계입니다.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>예상 수익</strong>: 분양수입 - 총 사업비. 음수이면 사업성이 없는 것입니다.</span></li>
              </ul>
            </Accordion>

            <Accordion title="🏗 국토부 자동조회 활용">
              <p className="mb-3">주소를 입력한 후 &apos;국토부 자동조회&apos; 버튼을 누르면 다음 정보가 자동으로 채워집니다:</p>
              <ul className="space-y-2">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>대지면적 (㎡)</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>용도지역 (제1종, 제2종, 제3종 등)</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>건폐율·용적률 상한</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>위성사진 및 지적도</span></li>
              </ul>
              <TipBox>
                도로명 주소로 조회가 안 되면 지번 주소로 다시 시도해 보세요. 예: &quot;서울특별시 강남구 삼성동 123-4&quot;
              </TipBox>
            </Accordion>

            <Accordion title="📄 PDF 보고서 활용">
              <p className="mb-3">생성된 PDF 보고서는 다음 용도로 활용할 수 있습니다:</p>
              <ul className="space-y-2">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>투자 검토 보고서</strong>: 토지 매입 의사결정을 위한 내부 검토 자료</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>사업계획서 첨부</strong>: PF 대출 신청 시 사전기획 근거 자료</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>건축사 미팅</strong>: 건축사와의 초기 미팅에서 설계 방향 논의 자료</span></li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><strong>비교 분석</strong>: 여러 후보지의 보고서를 비교하여 최적지 선정</span></li>
              </ul>
            </Accordion>

            <Accordion title="💎 무료 vs Pro 플랜">
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="font-semibold text-sm mb-2">무료 플랜</p>
                  <ul className="space-y-1.5 text-xs">
                    <li>• 월 10회 분석</li>
                    <li>• 빠른 분석</li>
                    <li>• 기본 배치안</li>
                    <li>• 기본 보고서</li>
                  </ul>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="font-semibold text-sm mb-2 text-primary">Pro 플랜</p>
                  <ul className="space-y-1.5 text-xs">
                    <li>• <strong>무제한</strong> 분석</li>
                    <li>• AI 렌더링</li>
                    <li>• 다중 배치안 비교</li>
                    <li>• 프리미엄 보고서</li>
                  </ul>
                </div>
              </div>
            </Accordion>
          </div>
        )}

        {/* ══════════ FAQ ══════════ */}
        {activeSection === "faq" && (
          <div className="space-y-4">
            <Accordion title="분석 결과를 저장할 수 있나요?" defaultOpen>
              <p>네, 분석 결과는 자동으로 클라우드에 저장됩니다. 로그인 후 작업한 내용은 다른 기기에서도 이어서 볼 수 있습니다. &apos;내 대시보드&apos;에서 이전 분석 목록을 확인할 수 있습니다.</p>
            </Accordion>
            <Accordion title="분석 결과의 정확도는 어느 정도인가요?">
              <p>Archi-Scan의 분석은 국토부 건축물대장, 토지이용계획 데이터를 기반으로 합니다. 법규 검토는 현행 법령을 반영하며, 사업성 분석은 실거래가 데이터를 참고합니다. 다만, 최종 설계와 인허가는 반드시 건축사와 함께 진행해야 합니다.</p>
            </Accordion>
            <Accordion title="어떤 지역에서 사용할 수 있나요?">
              <p>현재 대한민국 전역에서 사용 가능합니다. 국토부 API를 통해 전국의 건축물대장과 토지이용계획 정보를 조회합니다.</p>
            </Accordion>
            <Accordion title="모바일에서도 사용할 수 있나요?">
              <p>네, Archi-Scan은 모바일 최적화되어 있습니다. 스마트폰 브라우저에서 archiscan.kr에 접속하면 됩니다. 홈 화면에 추가하면 앱처럼 사용할 수 있습니다.</p>
            </Accordion>
            <Accordion title="무료 분석 횟수를 다 쓰면 어떻게 되나요?">
              <p>무료 플랜은 월 10회 분석이 가능합니다. 횟수를 모두 사용하면 해당 월에는 추가 분석이 제한되며, Pro 업그레이드 안내가 표시됩니다. 다음 달 1일에 횟수가 자동으로 초기화됩니다.</p>
            </Accordion>
            <Accordion title="결제 후 환불이 가능한가요?">
              <p>결제일로부터 7일 이내에 환불 요청이 가능합니다. 문의하기 페이지에서 환불 요청을 보내주시면 영업일 기준 3일 이내에 처리됩니다.</p>
            </Accordion>
            <Accordion title="보고서를 다시 다운로드할 수 있나요?">
              <p>네, 생성된 보고서는 해당 프로젝트에서 언제든 다시 다운로드할 수 있습니다. 보고서 단계에서 &apos;PDF 다운로드&apos; 버튼을 다시 클릭하면 됩니다.</p>
            </Accordion>
            <Accordion title="문의는 어디서 하나요?">
              <p>로그인 후 오른쪽 상단 프로필 메뉴에서 &apos;문의하기&apos;를 선택하거나, <a href="/contact" className="text-primary hover:underline">문의하기 페이지</a>에서 직접 문의할 수 있습니다.</p>
            </Accordion>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-2">지금 바로 시작해 보세요</h3>
            <p className="text-sm text-muted-foreground mb-4">주소만 입력하면 AI가 건축 사전기획을 완료합니다</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              분석 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
