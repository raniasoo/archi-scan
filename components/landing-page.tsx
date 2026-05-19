"use client"

import { Building2, MapPin, FileText, BarChart3, Sparkles, ArrowRight, CheckCircle2, Zap, Shield, Globe2 } from "lucide-react"

interface LandingPageProps {
  onStart: () => void
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-32">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Archi-Scan</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] mb-6">
              <span className="text-foreground">주소 입력만으로</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                건축 사업성을 분석합니다
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
              국토부 건축물대장 실데이터 · AI 3종(나노바나나 · Claude · ChatGPT)
              <br className="hidden sm:block" />
              5분 만에 사업성 분석 보고서 완성
            </p>

            {/* 신뢰 지표 */}
            <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">🏛 국토부 실데이터</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-medium">🤖 AI 3종 연동</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-medium">⚡ 5분 완성</span>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onStart}
                className="group flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 text-base touch-manipulation"
              >
                <Zap className="h-5 w-5" />
                무료로 시작하기
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-xs text-muted-foreground">회원가입 없이 바로 사용 가능</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "5단계", label: "용도지역 자동 조회" },
              { value: "4+", label: "AI 배치안 생성" },
              { value: "30초", label: "보고서 자동 생성" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl md:text-2xl font-extrabold text-primary">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">핵심 기능</p>
            <h2 className="text-2xl md:text-3xl font-bold">개발사업 검토, 이제 자동으로</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: MapPin,
                title: "국토부 자동 조회",
                desc: "주소만 입력하면 대지면적, 용도지역, 건폐율, 용적률을 5단계 API로 자동 조회합니다.",
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                icon: Sparkles,
                title: "AI 배치안 생성",
                desc: "대지 조건에 맞는 최적 배치안을 판상형, 타워형, 고밀도 등 4가지 이상 자동 생성합니다.",
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
              {
                icon: BarChart3,
                title: "사업성 분석",
                desc: "실거래가 기반 분양가, 공사비, ROI, 손익분기점을 자동 산출합니다.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: FileText,
                title: "보고서 자동 생성",
                desc: "PDF, HTML, Excel 형식의 개발사업 사전검토 보고서를 30초 만에 생성합니다.",
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-5 rounded-xl border border-border/50 hover:border-border bg-card/30 hover:bg-card/60 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${feature.bg} mb-3`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-bold text-sm mb-2">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 border-t border-border/50 bg-card/30">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">사용 방법</p>
            <h2 className="text-2xl md:text-3xl font-bold">3단계로 완료</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "주소 입력",
                desc: "대상지 주소를 입력하면 대지면적, 용도지역이 자동으로 채워집니다.",
              },
              {
                step: "02",
                title: "배치안 선택",
                desc: "AI가 생성한 배치안을 비교하고 최적안을 선택합니다.",
              },
              {
                step: "03",
                title: "보고서 다운로드",
                desc: "법규 검토, 사업성 분석이 포함된 보고서를 PDF로 받습니다.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center p-6">
                <span className="text-5xl font-black text-primary/10">{item.step}</span>
                <h3 className="font-bold text-sm mt-2 mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis Preview — 실제 결과물 미리보기 */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-emerald-500 tracking-widest uppercase mb-3">실제 분석 결과</p>
            <h2 className="text-2xl md:text-3xl font-bold">주소 하나로 이만큼 나옵니다</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* 대지 분석 카드 */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-500">
                <MapPin className="h-4 w-4" />
                대지 분석
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">용도지역</span><span className="font-semibold">제3종일반주거지역</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">대지면적</span><span className="font-semibold">660㎡</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">건폐율</span><span className="font-semibold">50%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">용적률</span><span className="font-semibold">300%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">경사도</span><span className="font-semibold text-green-500">완경사 3.2%</span></div>
              </div>
              <div className="h-16 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center text-[10px] text-muted-foreground">
                🗺 2D 지적도 + 3D 지형도
              </div>
            </div>

            {/* 배치안 카드 */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-500">
                <Sparkles className="h-4 w-4" />
                AI 배치안 (4종 자동 생성)
              </div>
              <div className="space-y-1.5">
                {[
                  { name: "고밀도 타워형", roi: "28.9%", color: "text-emerald-500" },
                  { name: "파노라마 타워형", roi: "22.1%", color: "text-blue-500" },
                  { name: "수익형 타워", roi: "31.4%", color: "text-emerald-500" },
                  { name: "컴팩트 중정형", roi: "18.7%", color: "text-amber-500" },
                ].map(l => (
                  <div key={l.name} className="flex justify-between items-center text-xs p-1.5 rounded bg-muted/30">
                    <span>{l.name}</span>
                    <span className={`font-bold ${l.color}`}>ROI {l.roi}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-purple-500 font-medium">
                <Sparkles className="h-3 w-3" />
                NEW: AI 건축 컨셉 이미지 프롬프트 자동 생성
              </div>
            </div>

            {/* 사업성 카드 */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <BarChart3 className="h-4 w-4" />
                사업성 분석
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">총사업비</span><span className="font-semibold">70.4억원</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">예상수익</span><span className="font-semibold text-emerald-500">20.4억원</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ROI</span><span className="font-bold text-emerald-500 text-sm">28.9%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">손익분기 분양률</span><span className="font-semibold">77.6%</span></div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✅ 투자 적정 (사업 추진 권고)</span>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-4">* 서울시 제3종일반주거지역 660㎡ 기준 예시 결과입니다</p>
        </div>
      </section>

      {/* Trust / Checklist */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">건축 전문가를 위한 도구</h2>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "국토부 건축물대장 + VWorld 자동 조회",
              "중첩 규제 자동 분석 (자연경관지구·고도지구·대공방어)",
              "AI 배치안 5종+ 자동 생성 & 비교",
              "🎨 나노바나나 AI 건축 렌더링",
              "💬 Claude AI 설계 컨설팅",
              "📝 ChatGPT 사업 제안서 자동 작성",
              "분담금 시뮬레이션 + 시나리오 비교",
              "PDF / HTML / Excel 보고서 + DXF CAD",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 py-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI 3종 연동 */}
      <section className="py-16 md:py-24 border-t border-border/50 bg-gradient-to-br from-violet-500/5 to-blue-500/5">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-violet-400 tracking-widest uppercase mb-3">AI 허브</p>
            <h2 className="text-2xl md:text-3xl font-bold">3개 AI가 함께 일합니다</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { emoji: "🎨", name: "나노바나나", role: "건축 렌더링", desc: "배치안 기반 4K 건물 외관 이미지를 자동 생성합니다", color: "emerald" },
              { emoji: "💬", name: "Claude", role: "설계 컨설팅", desc: "법규 해석, 배치안 평가, 리스크 진단을 AI가 상담합니다", color: "blue" },
              { emoji: "📝", name: "ChatGPT", role: "사업 제안서", desc: "투자자용 제안서, 주민설명회 자료를 자동 작성합니다", color: "amber" },
            ].map(ai => (
              <div key={ai.name} className={`rounded-xl border border-${ai.color}-500/20 bg-${ai.color}-500/5 p-5 text-center`}>
                <span className="text-3xl block mb-3">{ai.emoji}</span>
                <h3 className="font-bold text-sm mb-1">{ai.name}</h3>
                <p className={`text-xs font-semibold text-${ai.color}-400 mb-2`}>{ai.role}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ai.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24 border-t border-border/50 bg-card/30">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">요금제</p>
            <h2 className="text-2xl md:text-3xl font-bold">요금제는 별도 협의</h2>
            <p className="text-sm text-muted-foreground mt-2">프로젝트 규모와 사용 목적에 맞춰 최적의 플랜을 제안해 드립니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: "Basic",
                price: "별도 협의",
                period: "",
                features: ["사업성 분석", "기본 배치안 4종", "PDF 보고서", "국토부 자동 조회", "AI 렌더링"],
                cta: "문의하기",
                highlight: false,
              },
              {
                name: "Pro",
                price: "별도 협의",
                period: "",
                features: ["사업성 분석 확장", "AI 렌더링 확장", "AI 설계상담", "AI 사업 제안서", "분담금 시뮬레이션", "클라우드 저장"],
                cta: "문의하기",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "별도 협의",
                period: "",
                features: ["무제한 분석", "팀 협업", "API 접근", "커스텀 보고서", "전담 매니저", "SLA 보장"],
                cta: "문의하기",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-5 border ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border/50 bg-background"
                }`}
              >
                <h3 className="font-bold text-sm">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-extrabold">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onStart}
                  className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 shadow-lg shadow-primary/20 mb-6">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-sm text-muted-foreground mb-8">
            주소 하나로 건축 사업성을 5분 만에 파악할 수 있습니다
          </p>
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-base touch-manipulation"
          >
            <Zap className="h-5 w-5" />
            무료로 분석 시작
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center justify-center gap-6 mt-8 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> 회원가입 불필요</span>
            <span className="flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" /> 모바일 지원</span>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> 즉시 결과</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Archi-Scan</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/guide" className="hover:text-foreground transition-colors">사용 가이드</a>
            <a href="/terms" className="hover:text-foreground transition-colors">이용약관</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</a>
            <a href="/contact" className="hover:text-foreground transition-colors">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
