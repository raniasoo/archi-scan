"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Building2, MapPin, FileText, BarChart3, Sparkles,
  ArrowRight, CheckCircle2, Zap, Shield, Globe2,
  ChevronRight, Play, Star, TrendingUp, Layers,
  Scale, Brain, Camera, Eye, Download, Lock
} from "lucide-react"

/* ─── 카운트업 애니메이션 훅 ─── */
function useCountUp(end: number, duration = 2000, trigger = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start = 0
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setVal(end); clearInterval(timer) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [trigger, end, duration])
  return val
}

/* ─── 스크롤 관찰 훅 ─── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ─── 요금제 데이터 ─── */
const PLANS = [
  {
    name: "무료",
    price: "₩0",
    period: "",
    desc: "소규모 검토에 적합",
    cta: "무료로 시작",
    highlight: false,
    features: [
      { text: "월 10회 사업성 분석", included: true },
      { text: "AI 배치안 비교", included: true },
      { text: "AI 렌더링", included: true },
      { text: "PDF 보고서", included: true },
      { text: "국토부 자동조회", included: true },
      { text: "클라우드 저장", included: false },
      { text: "우선 기술지원", included: false },
    ],
  },
  {
    name: "Pro",
    price: "₩29,000",
    period: "/월",
    desc: "개인 디벨로퍼·건축사",
    cta: "Pro 시작하기",
    highlight: true,
    features: [
      { text: "월 30회 사업성 분석", included: true },
      { text: "AI 배치안 비교", included: true },
      { text: "AI 렌더링", included: true },
      { text: "PDF 보고서", included: true },
      { text: "국토부 자동조회", included: true },
      { text: "클라우드 저장", included: true },
      { text: "우선 기술지원", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "₩99,000",
    period: "/월",
    desc: "건축사사무소·시행사 팀",
    cta: "Enterprise 시작",
    highlight: false,
    features: [
      { text: "무제한 사업성 분석", included: true },
      { text: "AI 배치안 비교", included: true },
      { text: "AI 렌더링", included: true },
      { text: "PDF 보고서", included: true },
      { text: "국토부 자동조회", included: true },
      { text: "클라우드 저장", included: true },
      { text: "우선 기술지원", included: true },
    ],
  },
]

/* ─── 기능 카드 데이터 ─── */
const FEATURES = [
  {
    icon: Scale,
    title: "법규 자동 검토",
    desc: "용도지역·건폐율·용적률·일조권·주차장법까지 한 번에",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Layers,
    title: "AI 배치안 생성",
    desc: "대지 조건에 맞는 최적 배치안 4종 이상 자동 생성",
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: TrendingUp,
    title: "사업성 분석",
    desc: "ROI·NPV·IRR·손익분기 분양률까지 즉시 산출",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: Camera,
    title: "AI 렌더링",
    desc: "Gemini AI로 포토리얼리스틱 건축 렌더링 즉시 생성",
    color: "from-orange-500 to-amber-400",
  },
  {
    icon: FileText,
    title: "PDF 보고서",
    desc: "투자자 프레젠테이션 수준의 사전기획 보고서 자동 생성",
    color: "from-rose-500 to-pink-400",
  },
  {
    icon: MapPin,
    title: "국토부 연동",
    desc: "주소 입력만으로 건축물대장·용도지역·공시지가 자동 조회",
    color: "from-sky-500 to-blue-400",
  },
]

/* ─── 사례 데이터 ─── */
const CASES = [
  {
    address: "서울 강남구 역삼동",
    area: "450㎡",
    zone: "제3종일반주거지역",
    roi: "28.9%",
    type: "고밀도 타워형",
    profit: "20.4억원",
  },
  {
    address: "서울 마포구 합정동",
    area: "320㎡",
    zone: "제2종일반주거지역",
    roi: "24.1%",
    type: "파노라마 타워형",
    profit: "12.7억원",
  },
  {
    address: "경기 성남시 분당구",
    area: "680㎡",
    zone: "준주거지역",
    roi: "31.5%",
    type: "수익형 복합",
    profit: "35.2억원",
  },
]

export default function LandingPage() {
  const statsRef = useInView()
  const projectCount = useCountUp(2847, 2000, statsRef.inView)
  const reportCount = useCountUp(12500, 2000, statsRef.inView)
  const accuracy = useCountUp(97, 2000, statsRef.inView)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* JSON-LD 구조화 데이터 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebApplication",
            "name": "Archi-Scan",
            "url": "https://www.archiscan.kr",
            "description": "주소 입력만으로 대지 분석, 건축 법규 검토, AI 배치안 설계, 사업성 분석까지. 5분 안에 건축 사전기획을 완료하는 AI 플랫폼.",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": [
              { "@type": "Offer", "name": "무료", "price": "0", "priceCurrency": "KRW", "description": "월 10회 분석" },
              { "@type": "Offer", "name": "Pro", "price": "29000", "priceCurrency": "KRW", "description": "월 30회 분석" },
              { "@type": "Offer", "name": "Enterprise", "price": "99000", "priceCurrency": "KRW", "description": "무제한 분석" }
            ],
            "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "127" },
            "featureList": "AI 건축 렌더링, 법규 자동 검토, 배치안 설계, 사업성 분석, PDF 보고서, 인테리어 투시도"
          },
          {
            "@type": "Organization",
            "name": "Archi-Scan",
            "url": "https://www.archiscan.kr",
            "logo": "https://www.archiscan.kr/icons/icon-192.png",
            "sameAs": [],
            "contactPoint": { "@type": "ContactPoint", "email": "any00815@gmail.com", "contactType": "customer service" }
          },
          {
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "Archi-Scan은 무료인가요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 월 10회까지 무료로 사용 가능합니다. Pro 플랜(₩29,000/월)은 30회, Enterprise(₩99,000/월)는 무제한입니다." }},
              { "@type": "Question", "name": "어떤 지역을 분석할 수 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "대한민국 전 지역의 주소를 입력하면 국토부 실데이터 기반으로 자동 분석합니다." }},
              { "@type": "Question", "name": "AI 건축 렌더링은 어떻게 생성하나요?", "acceptedAnswer": { "@type": "Answer", "text": "12종 인테리어 스타일과 11종 외관 스타일을 선택하면 Gemini AI가 포토리얼 이미지를 자동 생성합니다. 정면, 조감도, 입구, 인테리어 4장을 한 번에 생성할 수 있습니다." }},
              { "@type": "Question", "name": "사업성 분석의 정확도는?", "acceptedAnswer": { "@type": "Answer", "text": "국토부 공시지가, 실거래가, 건축물대장 실데이터를 기반으로 분석하며, 전문 건축사가 검증한 로직을 사용합니다." }}
            ]
          }
        ]
      }) }} />
      {/* ━━━ NAV ━━━ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Archi-Scan</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition">기능</a>
            <a href="#interior" className="hover:text-white transition">인테리어</a>
            <a href="#cases" className="hover:text-white transition">사례</a>
            <a href="#pricing" className="hover:text-white transition">요금제</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-white/70 hover:text-white transition hidden sm:block"
            >
              로그인
            </Link>
            <Link
              href="/auth/login?signup=1"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] transition-all"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        {/* BG effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-teal-500/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/6 rounded-full blur-[100px]" />
          <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-5 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-8 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            AI 기반 건축 사전기획 플랫폼
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            <span className="text-white">주소 하나로</span>
            <br />
            <span className="bg-gradient-to-r from-teal-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              5분 안에 사업성 분석
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            국토부 실데이터 기반 법규 검토, AI 배치안 설계,
            <br className="hidden sm:block" />
            수익성 분석까지 — 건축 사전기획의 모든 것
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/auth/login?signup=1"
              className="group flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-teal-400 to-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.03] transition-all text-base"
            >
              <Zap className="h-5 w-5" />
              무료로 시작하기
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#cases"
              className="flex items-center gap-2 px-6 py-4 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <Eye className="h-4 w-4" />
              분석 사례 보기
            </a>
          </div>
          <p className="text-xs text-white/30">카카오 · 네이버 · 이메일로 간편 가입</p>
        </div>

        {/* Hero visual — Real app screenshots */}
        <div className="relative max-w-4xl mx-auto mt-16 px-5">
          {/* Main showcase */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* AI Rendering - large */}
            <div className="col-span-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 relative group">
              <img src="/screenshots/ai-render-bird.jpg" alt="AI 건축 렌더링 — 조감도" className="w-full h-auto" loading="eager" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="text-xs text-teal-400 font-semibold">✨ AI 건축 렌더링</div>
                <div className="text-sm text-white/90 font-medium">Gemini AI가 자동 생성한 포토리얼 조감도</div>
              </div>
            </div>

            {/* Isometric view */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/30">
              <img src="/screenshots/isometric.jpg" alt="아이소메트릭 배치도" className="w-full h-full object-cover" loading="eager" />
            </div>

            {/* Analysis result */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/30">
              <img src="/screenshots/analysis-result.jpg" alt="종합 검토 결과" className="w-full h-full object-cover" loading="lazy" />
            </div>

            {/* AI Rendering front */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/30 relative">
              <img src="/screenshots/ai-render-front.jpg" alt="AI 건축 렌더링 — 정면" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <div className="text-[10px] text-teal-400 font-semibold">🎨 Eye-level 렌더링</div>
              </div>
            </div>

            {/* PDF Report */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/30">
              <img src="/screenshots/pdf-report.jpg" alt="PDF 보고서" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          {/* Glow under card */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-teal-500/10 blur-3xl rounded-full" />
        </div>
      </section>

      {/* ━━━ STATS ━━━ */}
      <section ref={statsRef.ref} className="py-16 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 px-5 text-center">
          {[
            { val: projectCount.toLocaleString() + "+", label: "프로젝트 분석" },
            { val: reportCount.toLocaleString() + "+", label: "보고서 생성" },
            { val: accuracy + "%", label: "법규 검토 정확도" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">{s.val}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs text-teal-400 font-semibold tracking-widest uppercase">Features</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
              사전기획에 필요한 <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">모든 기능</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] p-6 transition-all hover:border-white/10 hover:shadow-lg hover:shadow-teal-500/5"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg mb-4`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section className="py-20 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs text-teal-400 font-semibold tracking-widest uppercase">How it works</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">3단계</span>로 끝나는 사전기획
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "주소 입력", desc: "도로명 또는 지번 주소를 입력하면 국토부 데이터를 자동으로 조회합니다", icon: MapPin },
              { step: "02", title: "AI 분석", desc: "법규 검토, 배치안 생성, 사업성 분석을 AI가 동시에 처리합니다", icon: Brain },
              { step: "03", title: "보고서 완성", desc: "투자자 프레젠테이션 수준의 보고서를 PDF로 다운로드합니다", icon: Download },
            ].map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400/20 to-emerald-500/20 border border-teal-500/20 mb-5">
                  <s.icon className="h-6 w-6 text-teal-400" />
                </div>
                <div className="text-[10px] text-teal-400/60 font-bold mb-2">STEP {s.step}</div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ REAL SCREENSHOTS — Feature Showcase ━━━ */}
      <section className="py-20 md:py-28 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs text-teal-400 font-semibold tracking-widest uppercase">Real Output</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">
              실제 <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">분석 결과물</span>
            </h2>
            <p className="text-sm text-white/40 mt-3 max-w-lg mx-auto">Archi-Scan이 자동으로 생성하는 전문 보고서의 실제 화면입니다</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { img: "/screenshots/market-price.jpg", title: "전문 보고서", desc: "AI 렌더링이 포함된 사전검토 보고서를 자동 생성" },
              { img: "/screenshots/scenario-compare.jpg", title: "종합 검토 결과", desc: "ROI, 총사업비, 예상수익과 AI 판정을 한눈에 확인" },
              { img: "/screenshots/legal-review.jpg", title: "법규 검토 & 배치안 비교", desc: "건폐율·용적률·높이제한 적정 여부와 배치안별 ROI 비교" },
              { img: "/screenshots/blueprints.jpg", title: "설계 도면 자동 생성", desc: "평면도, 배치도, 단면도, 아이소메트릭을 자동 생성" },
              { img: "/screenshots/report-summary.jpg", title: "사업 시나리오 비교", desc: "재건축·리모델링·통매각 시나리오별 분담금과 기간 비교" },
              { img: "/screenshots/report-cover.jpg", title: "프로젝트 로드맵", desc: "안전진단→사업성검토→주민동의→허가착공 단계별 일정 관리" },
              { img: "/screenshots/3d-terrain.jpg", title: "3D 지형 & 경사도 분석", desc: "대상지 3D 지적도와 경사도를 자동 분석하여 설계에 반영" },
              { img: "/screenshots/ai-hub.jpg", title: "AI 렌더링 허브", desc: "11종 건축 스타일, 시점·계절·재질을 선택해 포토리얼 이미지 생성" },
              { img: "/screenshots/legal-checklist.jpg", title: "법규 준수 체크리스트", desc: "접도·건폐율·용적률·주차·높이·조경·지구단위계획 자동 검토" },
            ].map((item) => (
              <div key={item.title} className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-teal-500/20 transition-all">
                <div className="aspect-[9/16] overflow-hidden bg-black/20 max-h-[320px]">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ INTERIOR SHOWCASE ━━━ */}
      <section id="interior" className="py-20 md:py-28 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs text-teal-400 font-semibold tracking-widest uppercase">Interior Rendering</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">
              <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">12종 인테리어</span> 스타일
            </h2>
            <p className="text-sm text-white/40 mt-3 max-w-lg mx-auto">외관 렌더링 + 인테리어 투시도를 한 번에 생성합니다. 분양 마케팅에 즉시 활용 가능한 이미지를 5분 안에 받아보세요.</p>
          </div>

          {/* 스타일 그리드 */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-10">
            {[
              { emoji: '✨', label: '모던 럭셔리', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30' },
              { emoji: '🪵', label: '화이트우드', color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30' },
              { emoji: '🏨', label: '호텔리어', color: 'from-stone-500/20 to-neutral-500/20 border-stone-500/30' },
              { emoji: '🌿', label: '내추럴모던', color: 'from-green-500/20 to-emerald-500/20 border-green-500/30' },
              { emoji: '🎨', label: '뉴트로', color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30' },
              { emoji: '◻️', label: '미니멀', color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30' },
              { emoji: '🏝️', label: '제주 감성', color: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/30' },
              { emoji: '🪞', label: '클래식', color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30' },
              { emoji: '🏯', label: '한옥 모던', color: 'from-red-500/20 to-orange-500/20 border-red-500/30' },
              { emoji: '🏢', label: '프리미엄 아파트', color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/30' },
              { emoji: '💑', label: '신혼집', color: 'from-pink-400/20 to-fuchsia-400/20 border-pink-400/30' },
              { emoji: '💎', label: '강남 럭셔리', color: 'from-yellow-400/20 to-amber-400/20 border-yellow-400/30' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl bg-gradient-to-br ${s.color} border p-3 text-center hover:scale-105 transition-transform`}>
                <span className="text-2xl block mb-1">{s.emoji}</span>
                <span className="text-[10px] md:text-xs font-semibold text-white/80">{s.label}</span>
              </div>
            ))}
          </div>

          {/* 멀티앵글 4장 강조 */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-4">
                  📐 멀티앵글 4장 자동 생성
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3">분양 홍보 이미지<br/><span className="text-teal-400">원클릭 완성</span></h3>
                <p className="text-sm text-white/50 leading-relaxed mb-4">
                  정면 · 조감도 · 입구 · 인테리어 4장을 한 번에 생성합니다. 
                  분양사무소, 홍보 브로셔, SNS 마케팅에 바로 활용할 수 있는 포토리얼 이미지입니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['👁️ 정면 시점','🦅 조감도','🚪 입구 클로즈업','🛋️ 인테리어'].map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">{t}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '정면 · 보행자', img: '/screenshots/render-front.jpg' },
                  { label: '조감도 · 드론', img: '/screenshots/render-bird.jpg' },
                  { label: '입구 · 클로즈업', img: '/screenshots/render-entrance.jpg' },
                  { label: '인테리어 · 실내', img: '/screenshots/render-interior.jpg' },
                ].map(v => (
                  <div key={v.label} className="rounded-xl overflow-hidden border border-white/10 relative group">
                    <img src={v.img} alt={v.label} className="w-full aspect-[4/3] object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                      <span className="text-[10px] font-semibold text-white/90">{v.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 타겟 메시지 */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              { icon: '🏗️', title: '시행사 · 디벨로퍼', desc: '사업성 분석부터 분양 이미지까지 원스톱으로 준비' },
              { icon: '📊', title: '분양대행사', desc: '12종 스타일로 잠재 수분양자 취향에 맞는 이미지 제공' },
              { icon: '🎨', title: '인테리어 업체', desc: '시공 전 고객에게 완성 이미지를 미리 보여주는 상담 도구' },
            ].map(t => (
              <div key={t.title} className="rounded-xl bg-white/[0.03] border border-white/5 p-5 text-center">
                <span className="text-2xl block mb-2">{t.icon}</span>
                <h4 className="text-sm font-bold text-white mb-1">{t.title}</h4>
                <p className="text-xs text-white/40 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <a href="/auth/login" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-sm hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25">
              🛋️ 인테리어 렌더링 체험하기
            </a>
            <p className="text-xs text-white/30 mt-2">무료 10회 · 가입 즉시 사용</p>
          </div>
        </div>
      </section>

      {/* ━━━ CASES ━━━ */}
      <section id="cases" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs text-teal-400 font-semibold tracking-widest uppercase">Case Studies</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">
              실제 <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">분석 사례</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {CASES.map((c) => (
              <div key={c.address} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-teal-500/20 transition-all group">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 p-5 border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-teal-400" />
                    {c.address}
                  </div>
                  <div className="text-2xl font-extrabold text-white">ROI {c.roi}</div>
                  <div className="text-xs text-teal-400 mt-1">{c.type}</div>
                </div>
                {/* Details */}
                <div className="p-5 space-y-2.5">
                  {[
                    { label: "대지면적", val: c.area },
                    { label: "용도지역", val: c.zone },
                    { label: "예상수익", val: c.profit },
                  ].map((d) => (
                    <div key={d.label} className="flex justify-between text-sm">
                      <span className="text-white/40">{d.label}</span>
                      <span className="text-white/80 font-medium">{d.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ PRICING ━━━ */}
      <section id="pricing" className="py-20 md:py-28 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs text-teal-400 font-semibold tracking-widest uppercase">Pricing</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">합리적인</span> 요금제
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-6 md:p-8 border transition-all ${
                  p.highlight
                    ? "border-teal-500/40 bg-gradient-to-b from-teal-500/10 to-transparent shadow-xl shadow-teal-500/10 scale-[1.02]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {p.highlight && (
                  <div className="inline-block px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold mb-4">
                    추천
                  </div>
                )}
                <div className="text-lg font-bold text-white">{p.name}</div>
                <div className="mt-2">
                  <span className="text-3xl md:text-4xl font-extrabold text-white">{p.price}</span>
                  <span className="text-sm text-white/40">{p.period}</span>
                </div>
                <p className="text-sm text-white/40 mt-2 mb-6">{p.desc}</p>

                <Link
                  href="/auth/login?signup=1"
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    p.highlight
                      ? "bg-gradient-to-r from-teal-400 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {p.cta}
                </Link>

                <div className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <div key={f.text} className="flex items-center gap-2.5 text-sm">
                      {f.included ? (
                        <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-white/15 flex-shrink-0" />
                      )}
                      <span className={f.included ? "text-white/70" : "text-white/25"}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ BOTTOM CTA ━━━ */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-teal-500/8 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            지금 바로 <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">시작하세요</span>
          </h2>
          <p className="text-base text-white/40 mb-8 max-w-md mx-auto">
            카카오 또는 네이버 계정으로 30초 만에 가입하고, 첫 사업성 분석을 무료로 경험해 보세요.
          </p>
          <Link
            href="/auth/login?signup=1"
            className="group inline-flex items-center gap-2.5 px-10 py-4 bg-gradient-to-r from-teal-400 to-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.03] transition-all text-lg"
          >
            <Zap className="h-5 w-5" />
            무료로 시작하기
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold">Archi-Scan</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <a href="/terms" className="hover:text-white/60 transition">이용약관</a>
            <a href="/privacy" className="hover:text-white/60 transition">개인정보처리방침</a>
            <a href="/contact" className="hover:text-white/60 transition">문의하기</a>
          </div>
          <p className="text-xs text-white/20">© 2026 Archi-Scan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
