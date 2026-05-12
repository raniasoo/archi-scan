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
          background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 30%, #0c4a6e 55%, #134e4a 85%, #0f172a 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Logo + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '28px', color: 'white' }}>🏗</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#5eead4' }}>Archi-Scan</span>
        </div>

        {/* Main title */}
        <h1 style={{
          fontSize: '56px',
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 1.2,
          margin: '0 80px 16px',
        }}>
          AI 건축 사전기획 플랫폼
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '22px',
          color: '#94a3b8',
          textAlign: 'center',
          margin: '0 100px 36px',
        }}>
          주소만 입력하면 5분 안에 완료
        </p>

        {/* Feature pills - no .map(), explicit elements */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px' }}>
          <div style={{ padding: '8px 18px', borderRadius: '20px', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>🔍 대지 분석</div>
          <div style={{ padding: '8px 18px', borderRadius: '20px', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>📐 법규 검토</div>
          <div style={{ padding: '8px 18px', borderRadius: '20px', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>🏢 배치안 설계</div>
          <div style={{ padding: '8px 18px', borderRadius: '20px', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>💰 사업성 분석</div>
          <div style={{ padding: '8px 18px', borderRadius: '20px', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>🎨 AI 렌더링</div>
          <div style={{ padding: '8px 18px', borderRadius: '20px', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.2)', color: '#5eead4', fontSize: '15px', fontWeight: 600, display: 'flex' }}>📄 PDF 보고서</div>
        </div>

        {/* Bottom URL */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          display: 'flex',
        }}>
          <span style={{ fontSize: '15px', color: 'rgba(148,163,184,0.6)', fontWeight: 500 }}>archiscan.kr</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
