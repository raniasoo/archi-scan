import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY not set')
    _resend = new Resend(key)
  }
  return _resend
}

interface ReceiptData {
  to: string
  customerName: string
  orderId: string
  amount: number
  plan: string
  paymentMethod?: string
  approvedAt?: string
  expiresAt?: string
}

export async function sendPaymentReceipt(data: ReceiptData) {
  const { to, customerName, orderId, amount, plan, paymentMethod, approvedAt, expiresAt } = data
  
  const planLabel = plan === 'enterprise' ? 'Enterprise' : 'Pro'
  const formattedAmount = `₩${amount.toLocaleString()}`
  const formattedDate = approvedAt 
    ? new Date(approvedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  try {
    const result = await getResend().emails.send({
      from: 'Archi-Scan <noreply@archiscan.kr>',
      to: [to],
      subject: `[Archi-Scan] ${planLabel} 플랜 결제 완료 — ${formattedAmount}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a,#134e4a);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <div style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);border-radius:12px;padding:12px;margin-bottom:16px;">
        <span style="font-size:24px;">🏗</span>
      </div>
      <h1 style="color:#5eead4;font-size:20px;margin:0 0 4px;">Archi-Scan</h1>
      <p style="color:#94a3b8;font-size:13px;margin:0;">결제 영수증</p>
    </div>
    
    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
      
      <h2 style="font-size:18px;color:#111;margin:0 0 24px;">
        ${customerName}님, ${planLabel} 플랜 결제가 완료되었습니다! 🎉
      </h2>
      
      <!-- Receipt Table -->
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:12px 0;color:#6b7280;">주문번호</td>
          <td style="padding:12px 0;text-align:right;color:#111;font-family:monospace;font-size:12px;">${orderId}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:12px 0;color:#6b7280;">플랜</td>
          <td style="padding:12px 0;text-align:right;color:#111;font-weight:600;">${planLabel} (월간)</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:12px 0;color:#6b7280;">결제 금액</td>
          <td style="padding:12px 0;text-align:right;color:#111;font-weight:700;font-size:18px;">${formattedAmount}</td>
        </tr>
        ${paymentMethod ? `<tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:12px 0;color:#6b7280;">결제 수단</td>
          <td style="padding:12px 0;text-align:right;color:#111;">${paymentMethod}</td>
        </tr>` : ''}
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:12px 0;color:#6b7280;">결제 일시</td>
          <td style="padding:12px 0;text-align:right;color:#111;">${formattedDate}</td>
        </tr>
        ${formattedExpiry ? `<tr>
          <td style="padding:12px 0;color:#6b7280;">이용 기간</td>
          <td style="padding:12px 0;text-align:right;color:#111;">~ ${formattedExpiry}</td>
        </tr>` : ''}
      </table>
      
      <!-- Pro Features -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="font-size:13px;font-weight:600;color:#166534;margin:0 0 8px;">✨ ${planLabel} 기능이 활성화되었습니다</p>
        <ul style="margin:0;padding-left:20px;color:#166534;font-size:12px;line-height:1.8;">
          <li>멀티앵글 AI 렌더링 4장</li>
          <li>인테리어 3안 비교</li>
          <li>분양 브로셔 PDF 5종</li>
          <li>엑셀 내보내기</li>
          <li>클라우드 프로젝트 저장</li>
          ${plan === 'enterprise' ? '<li>커스텀 브랜딩</li><li>무제한 분석</li>' : '<li>월 30회 분석</li>'}
        </ul>
      </div>
      
      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.archiscan.kr" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
          Archi-Scan 시작하기 →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="padding:24px;text-align:center;border-radius:0 0 16px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;">
      <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">본 메일은 Archi-Scan 결제 완료 시 자동 발송됩니다.</p>
      <p style="font-size:11px;color:#9ca3af;margin:0;">문의: any00815@gmail.com | archiscan.kr</p>
    </div>
  </div>
</body>
</html>`,
    })

    console.log('[EMAIL] Receipt sent to', to, result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('[EMAIL] Failed to send receipt:', error)
    return { success: false, error: error instanceof Error ? error.message : 'email failed' }
  }
}

// ━━━ 환영 이메일 ━━━

interface WelcomeData {
  to: string
  userName?: string
}

export async function sendWelcomeEmail(data: WelcomeData) {
  const { to, userName } = data
  const displayName = userName || to.split('@')[0]

  try {
    const result = await getResend().emails.send({
      from: 'Archi-Scan <noreply@archiscan.kr>',
      to: [to],
      subject: `${displayName}님, Archi-Scan에 오신 것을 환영합니다!`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','맑은 고딕',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="height:5px;background:linear-gradient(90deg,#2F6B4F 0%,#3d8b68 50%,#2F6B4F 100%);border-radius:8px 8px 0 0;"></div>
    <div style="background:#ffffff;padding:32px 32px 24px;border-left:1px solid #e8e4de;border-right:1px solid #e8e4de;">
      <div style="padding-bottom:16px;border-bottom:1px solid #e8e4de;margin-bottom:24px;">
        <span style="font-size:14px;font-weight:700;letter-spacing:3px;color:#2F6B4F;">ARCHI-SCAN</span>
      </div>
      <h1 style="font-size:24px;font-weight:300;color:#1a1a1a;margin:0 0 8px;line-height:1.4;">환영합니다, ${displayName}님!</h1>
      <p style="font-size:14px;color:#8a8075;margin:0;line-height:1.6;">AI 기반 건축기획 분석 플랫폼 Archi-Scan의 회원이 되셨습니다.</p>
    </div>
    <div style="background:#ffffff;padding:0 32px 32px;border-left:1px solid #e8e4de;border-right:1px solid #e8e4de;">
      <div style="background:#faf9f7;border:1px solid #e8e4de;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="font-size:12px;letter-spacing:2px;color:#2F6B4F;font-weight:600;margin:0 0 16px;text-transform:uppercase;">Quick Start Guide</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e8e4de;vertical-align:top;width:36px;"><div style="width:28px;height:28px;background:#2F6B4F;border-radius:50%;color:white;text-align:center;line-height:28px;font-size:13px;font-weight:600;">1</div></td>
            <td style="padding:12px 0 12px 12px;border-bottom:1px solid #e8e4de;"><p style="font-size:14px;font-weight:600;color:#2a2520;margin:0 0 4px;">대상지 주소 입력</p><p style="font-size:12px;color:#8a8075;margin:0;">도로명 주소를 입력하면 대지면적, 용도지역, 건폐율, 용적률이 자동 조회됩니다.</p></td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e8e4de;vertical-align:top;"><div style="width:28px;height:28px;background:#2F6B4F;border-radius:50%;color:white;text-align:center;line-height:28px;font-size:13px;font-weight:600;">2</div></td>
            <td style="padding:12px 0 12px 12px;border-bottom:1px solid #e8e4de;"><p style="font-size:14px;font-weight:600;color:#2a2520;margin:0 0 4px;">법규 검토 & 배치안 생성</p><p style="font-size:12px;color:#8a8075;margin:0;">AI가 법규를 자동 검토하고, 대지에 맞는 최적 배치안을 여러 개 제안합니다.</p></td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e8e4de;vertical-align:top;"><div style="width:28px;height:28px;background:#2F6B4F;border-radius:50%;color:white;text-align:center;line-height:28px;font-size:13px;font-weight:600;">3</div></td>
            <td style="padding:12px 0 12px 12px;border-bottom:1px solid #e8e4de;"><p style="font-size:14px;font-weight:600;color:#2a2520;margin:0 0 4px;">AI 건축 렌더링</p><p style="font-size:12px;color:#8a8075;margin:0;">실제 거리뷰를 참조한 포토리얼리스틱 건축 렌더링을 자동 생성합니다.</p></td>
          </tr>
          <tr>
            <td style="padding:12px 0;vertical-align:top;"><div style="width:28px;height:28px;background:#2F6B4F;border-radius:50%;color:white;text-align:center;line-height:28px;font-size:13px;font-weight:600;">4</div></td>
            <td style="padding:12px 0 12px 12px;"><p style="font-size:14px;font-weight:600;color:#2a2520;margin:0 0 4px;">사전검토 보고서 생성</p><p style="font-size:12px;color:#8a8075;margin:0;">사업성 분석, 법규 검토, 리스크 평가가 포함된 전문 보고서를 PDF로 다운로드하세요.</p></td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin:8px 0 0;">
        <a href="https://www.archiscan.kr" style="display:inline-block;background:#2F6B4F;color:white;padding:14px 40px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.5px;">지금 시작하기 →</a>
      </div>
    </div>
    <div style="background:#faf9f7;padding:20px 32px;border-radius:0 0 8px 8px;border:1px solid #e8e4de;border-top:none;text-align:center;">
      <p style="font-size:11px;color:#8a8075;margin:0 0 4px;">Archi-Scan · AI 기반 건축기획 분석 플랫폼</p>
      <p style="font-size:11px;color:#b0a99e;margin:0;">문의: any00815@gmail.com · archiscan.kr</p>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#2F6B4F 0%,#3d8b68 50%,#2F6B4F 100%);border-radius:0 0 8px 8px;"></div>
  </div>
</body>
</html>`,
    })
    console.log('[EMAIL] Welcome sent to', to, result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('[EMAIL] Failed to send welcome:', error)
    return { success: false, error: error instanceof Error ? error.message : 'welcome email failed' }
  }
}
