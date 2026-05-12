import Link from "next/link"
import { Building2, ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "이용약관 | Archi-Scan",
  description: "Archi-Scan 서비스 이용약관",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-5 h-14">
          <Link href="/landing" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center"><Building2 className="h-4 w-4 text-primary-foreground" /></div>
            <span className="font-bold text-sm">Archi-Scan</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-2">이용약관</h1>
        <p className="text-sm text-muted-foreground mb-8">최종 수정일: 2026년 5월 12일 | 시행일: 2026년 5월 12일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제1조 (목적)</h2>
            <p>이 약관은 Archi-Scan(이하 &quot;서비스&quot;)이 제공하는 AI 건축 사전기획 플랫폼의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제2조 (정의)</h2>
            <p>① &quot;서비스&quot;란 Archi-Scan(archiscan.kr)이 제공하는 웹 기반 건축 사전기획 분석, AI 배치안 생성, 사업성 분석, 보고서 생성 등 일체의 서비스를 의미합니다.</p>
            <p>② &quot;이용자&quot;란 이 약관에 따라 서비스에 접속하여 서비스를 이용하는 회원 및 비회원을 말합니다.</p>
            <p>③ &quot;회원&quot;이란 서비스에 가입하여 아이디(계정)를 부여받은 자를 말합니다.</p>
            <p>④ &quot;유료 서비스&quot;란 서비스가 유료로 제공하는 프로(Pro) 플랜 등 각종 부가 서비스를 의미합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제3조 (약관의 효력 및 변경)</h2>
            <p>① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
            <p>② 서비스는 관련 법령에 위배되지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여 최소 7일 전에 공지합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제4조 (서비스의 제공)</h2>
            <p>서비스는 다음의 기능을 제공합니다.</p>
            <p>① 대지 분석 및 용도지역 자동 조회 (국토부 건축물대장 연동)</p>
            <p>② AI 기반 건축 배치안 생성 및 최적화</p>
            <p>③ 사업성 분석 (ROI, NPV, IRR, 손익분기 분양률 등)</p>
            <p>④ AI 포토리얼 렌더링 (Gemini AI)</p>
            <p>⑤ PDF/엑셀 보고서 생성 및 다운로드</p>
            <p>⑥ 기타 서비스가 정하는 부가 기능</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제5조 (회원가입)</h2>
            <p>① 이용자는 서비스가 제공하는 가입 양식에 따라 회원정보를 기입하고 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</p>
            <p>② 회원가입은 카카오, 네이버, 구글 소셜 로그인 또는 이메일/비밀번호 방식으로 할 수 있습니다.</p>
            <p>③ 서비스는 다음 각 호에 해당하는 신청에 대하여 승낙하지 않을 수 있습니다: 실명이 아니거나 타인의 정보를 이용한 경우, 허위 정보를 기재한 경우, 기타 서비스가 정한 이용신청 요건이 충족되지 않은 경우.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제6조 (요금제 및 결제)</h2>
            <p>① 서비스는 무료 플랜과 유료 프로(Pro) 플랜을 제공합니다.</p>
            <p>② 무료 플랜: 월 5회 사업성 분석, 기본 보고서(HTML), 국토부 자동조회, 기본 배치안 4종을 이용할 수 있습니다.</p>
            <p>③ 프로(Pro) 플랜: 월 29,000원(부가세 포함)으로 무제한 분석, PDF/엑셀 보고서, AI 렌더링, 실거래가 분석 등 전체 기능을 이용할 수 있습니다.</p>
            <p>④ 유료 서비스의 결제는 토스페이먼츠를 통해 처리되며, 결제 관련 사항은 토스페이먼츠의 이용약관을 따릅니다.</p>
            <p>⑤ 유료 서비스 이용 기간은 결제일로부터 30일이며, 별도 해지 요청이 없는 경우 자동 갱신되지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제7조 (환불 정책)</h2>
            <p>① 결제 후 7일 이내에 서비스를 이용하지 않은 경우 전액 환불이 가능합니다.</p>
            <p>② 서비스 이용 후에는 이용 일수에 비례하여 일할 계산된 금액을 차감한 후 환불합니다.</p>
            <p>③ 환불 요청은 서비스 내 문의 또는 contact@archiscan.kr로 신청할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제8조 (이용자의 의무)</h2>
            <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <p>① 타인의 정보를 도용하는 행위</p>
            <p>② 서비스의 운영을 고의로 방해하는 행위</p>
            <p>③ 서비스를 이용하여 얻은 정보를 서비스의 사전 승낙 없이 상업적으로 이용하거나 제3자에게 제공하는 행위</p>
            <p>④ 서비스의 저작권 및 지적재산권을 침해하는 행위</p>
            <p>⑤ 기타 관련 법령에 위배되는 행위</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제9조 (서비스의 제한 및 중지)</h2>
            <p>① 서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
            <p>② 서비스는 천재지변, 비상사태 등 불가항력적인 사유가 있는 경우 서비스의 전부 또는 일부를 제한하거나 중지할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제10조 (면책 조항)</h2>
            <p>① 서비스가 제공하는 분석 결과, AI 배치안, 사업성 분석 등은 참고용이며, 실제 건축 사업 추진 시에는 반드시 전문가(건축사, 법무사, 감정평가사 등)의 검토를 받아야 합니다.</p>
            <p>② 서비스는 분석 결과의 정확성, 완전성, 신뢰성을 보증하지 않으며, 이를 근거로 한 투자 결정 등에 대하여 책임을 지지 않습니다.</p>
            <p>③ 국토부, JUSO 등 외부 API의 장애, 데이터 오류 등으로 인한 서비스 품질 저하에 대해서는 책임을 지지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제11조 (분쟁 해결)</h2>
            <p>① 서비스와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법률을 적용하며, 서울중앙지방법원을 관할 법원으로 합니다.</p>
            <p>② 서비스와 이용자 간에 제기된 전자상거래 관련 분쟁에 대해서는 한국소비자원 또는 전자문서·전자거래 분쟁조정위원회의 조정에 따를 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">부칙</h2>
            <p>이 약관은 2026년 5월 12일부터 시행합니다.</p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t text-xs text-muted-foreground">
          <p>문의: <a href="mailto:contact@archiscan.kr" className="text-primary hover:underline">contact@archiscan.kr</a></p>
        </div>
      </main>
    </div>
  )
}
