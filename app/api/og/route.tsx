import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 35%, #0c4a6e 65%, #134e4a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '32px', color: 'white' }}>🏗</span>
          </div>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#5eead4' }}>Archi-Scan</span>
        </div>
        <h1 style={{ fontSize: '52px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1.2, margin: '0 60px 16px' }}>
          AI 건축 사전기획 플랫폼
        </h1>
        <p style={{ fontSize: '22px', color: '#94a3b8', textAlign: 'center', margin: '0 80px' }}>
          주소 입력만으로 건축 사업성을 분석합니다
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
          <div style={{ padding: '8px 20px', borderRadius: '24px', background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>국토부 자동조회</div>
          <div style={{ padding: '8px 20px', borderRadius: '24px', background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>국토부 자동조회</div>
          <div style={{ padding: '8px 20px', borderRadius: '24px', background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>AI 배치안</div>
          <div style={{ padding: '8px 20px', borderRadius: '24px', background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>사업성 분석</div>
          <div style={{ padding: '8px 20px', borderRadius: '24px', background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>PDF 보고서</div>
          <div style={{ padding: '8px 20px', borderRadius: '24px', background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>PDF 보고서</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
