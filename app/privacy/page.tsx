import Link from "next/link"
import { Building2, ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "개인정보처리방침 | Archi-Scan",
  description: "Archi-Scan 개인정보처리방침",
}

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold mb-2">개인정보처리방침</h1>
        <p className="text-sm text-muted-foreground mb-8">최종 수정일: 2026년 5월 12일 | 시행일: 2026년 5월 12일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">

          <section>
            <p>Archi-Scan(이하 &quot;서비스&quot;)은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제1조 (수집하는 개인정보 항목)</h2>
            <p>서비스는 다음의 개인정보 항목을 수집합니다.</p>
            <p className="font-medium text-foreground mt-3">1. 회원가입 시</p>
            <p>• 이메일 로그인: 이메일 주소, 비밀번호(암호화 저장)</p>
            <p>• 카카오 로그인: 이메일 주소, 이름(닉네임), 프로필 사진</p>
            <p>• 네이버 로그인: 이메일 주소, 이름(닉네임), 프로필 사진</p>
            <p>• 구글 로그인: 이메일 주소, 이름, 프로필 사진</p>
            <p className="font-medium text-foreground mt-3">2. 서비스 이용 시 자동 수집</p>
            <p>• 서비스 이용 기록 (분석 횟수, 보고서 생성 기록)</p>
            <p>• 접속 IP 주소, 브라우저 종류, 접속 시간</p>
            <p>• 쿠키 (세션 관리 목적)</p>
            <p className="font-medium text-foreground mt-3">3. 결제 시</p>
            <p>• 결제 수단 정보는 토스페이먼츠가 직접 처리하며, 서비스는 결제 결과(주문번호, 결제금액, 결제일시)만 저장합니다. 카드번호 등 민감 결제정보는 서비스에 저장되지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제2조 (개인정보의 수집 및 이용 목적)</h2>
            <p>서비스는 수집한 개인정보를 다음의 목적을 위해 이용합니다.</p>
            <p>① 회원 관리: 회원 가입, 본인 확인, 서비스 부정이용 방지</p>
            <p>② 서비스 제공: 건축 사전기획 분석, AI 배치안 생성, 보고서 생성 등 서비스 기능 제공</p>
            <p>③ 요금 결제 및 정산: 유료 서비스 이용에 따른 결제 처리</p>
            <p>④ 서비스 개선: 이용 통계 분석, 서비스 품질 향상, 신규 기능 개발</p>
            <p>⑤ 고객 지원: 문의 응대, 불만 처리, 공지사항 전달</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제3조 (개인정보의 보유 및 이용 기간)</h2>
            <p>서비스는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 경우에는 명시한 기간 동안 보유합니다.</p>
            <p>① 회원 탈퇴 시: 즉시 파기 (단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관)</p>
            <p>② 전자상거래 등에서의 소비자 보호에 관한 법률에 따른 보존:</p>
            <p className="pl-4">• 계약 또는 청약 철회에 관한 기록: 5년</p>
            <p className="pl-4">• 대금결제 및 재화 등의 공급에 관한 기록: 5년</p>
            <p className="pl-4">• 소비자 불만 또는 분쟁 처리에 관한 기록: 3년</p>
            <p>③ 통신비밀보호법에 따른 로그인 기록: 3개월</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제4조 (개인정보의 제3자 제공)</h2>
            <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
            <p>① 이용자가 사전에 동의한 경우</p>
            <p>② 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제5조 (개인정보 처리의 위탁)</h2>
            <p>서비스는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
            <div className="mt-2 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="px-3 py-2 text-left font-medium text-foreground">수탁 업체</th><th className="px-3 py-2 text-left font-medium text-foreground">위탁 업무</th></tr></thead>
                <tbody>
                  <tr className="border-t"><td className="px-3 py-2">Supabase (미국)</td><td className="px-3 py-2">회원 인증 및 데이터 저장</td></tr>
                  <tr className="border-t"><td className="px-3 py-2">Vercel (미국)</td><td className="px-3 py-2">웹 서비스 호스팅</td></tr>
                  <tr className="border-t"><td className="px-3 py-2">토스페이먼츠 (한국)</td><td className="px-3 py-2">결제 처리</td></tr>
                  <tr className="border-t"><td className="px-3 py-2">Google (미국)</td><td className="px-3 py-2">소셜 로그인, 서비스 분석(Google Analytics)</td></tr>
                  <tr className="border-t"><td className="px-3 py-2">카카오 (한국)</td><td className="px-3 py-2">소셜 로그인</td></tr>
                  <tr className="border-t"><td className="px-3 py-2">네이버 (한국)</td><td className="px-3 py-2">소셜 로그인</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제6조 (개인정보의 국외 이전)</h2>
            <p>서비스는 클라우드 인프라 특성상 다음과 같이 개인정보를 국외로 이전하여 처리할 수 있습니다.</p>
            <p>① Supabase: 미국 소재 서버에 회원 정보 및 이용 기록 저장</p>
            <p>② Vercel: 미국 및 글로벌 CDN을 통한 서비스 제공</p>
            <p>③ Google: 미국 소재 서버에서 인증 및 분석 처리</p>
            <p>위 업체들은 각각의 개인정보 보호 정책을 준수하며, 적절한 보안 조치를 시행하고 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제7조 (개인정보의 파기)</h2>
            <p>① 서비스는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
            <p>② 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제8조 (이용자의 권리와 행사 방법)</h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <p>① 개인정보 열람 요구</p>
            <p>② 오류 등이 있을 경우 정정 요구</p>
            <p>③ 삭제 요구</p>
            <p>④ 처리 정지 요구</p>
            <p>위 권리 행사는 contact@archiscan.kr로 요청하실 수 있으며, 서비스는 이에 대해 지체 없이 조치합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제9조 (쿠키의 사용)</h2>
            <p>① 서비스는 로그인 세션 관리를 위해 쿠키를 사용합니다.</p>
            <p>② 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 로그인이 필요한 서비스 이용이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제10조 (개인정보 보호를 위한 기술적·관리적 대책)</h2>
            <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <p>① 비밀번호 암호화: 이용자의 비밀번호는 단방향 암호화(bcrypt)하여 저장 및 관리됩니다.</p>
            <p>② SSL/TLS 암호화: 개인정보는 암호화 통신(HTTPS)을 통해 전송됩니다.</p>
            <p>③ 접근 제한: 개인정보에 대한 접근 권한을 최소한의 인원으로 제한합니다.</p>
            <p>④ Row Level Security: 데이터베이스 레벨에서 사용자별 데이터 접근을 제한합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제11조 (개인정보 보호 책임자)</h2>
            <div className="mt-2 border rounded-lg p-4">
              <p className="font-medium text-foreground">개인정보 보호 책임자</p>
              <p className="mt-1">이메일: <a href="mailto:contact@archiscan.kr" className="text-primary hover:underline">contact@archiscan.kr</a></p>
            </div>
            <p className="mt-3">이용자는 서비스 이용 중 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등에 관한 사항을 개인정보 보호 책임자에게 문의할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">제12조 (권익침해 구제 방법)</h2>
            <p>이용자는 개인정보 침해에 대한 피해 구제, 상담 등을 아래 기관에 문의할 수 있습니다.</p>
            <p>• 개인정보 침해신고센터: (국번 없이) 118 / privacy.kisa.or.kr</p>
            <p>• 개인정보 분쟁조정위원회: (국번 없이) 1833-6972 / www.kopico.go.kr</p>
            <p>• 대검찰청 사이버수사과: (국번 없이) 1301 / www.spo.go.kr</p>
            <p>• 경찰청 사이버안전국: (국번 없이) 182 / ecrm.cyber.go.kr</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">부칙</h2>
            <p>이 개인정보처리방침은 2026년 5월 12일부터 시행합니다.</p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t text-xs text-muted-foreground">
          <p>문의: <a href="mailto:contact@archiscan.kr" className="text-primary hover:underline">contact@archiscan.kr</a></p>
        </div>
      </main>
    </div>
  )
}
