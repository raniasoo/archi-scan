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
        {/* Background grid pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(rgba(94,234,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          display: 'flex',
        }} />
        
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
        }} />

        {/* Logo + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', zIndex: 1 }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(20,184,166,0.3)',
          }}>
            <span style={{ fontSize: '28px', color: 'white' }}>🏗</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#5eead4', letterSpacing: '-0.5px' }}>Archi-Scan</span>
        </div>

        {/* Main title */}
        <h1 style={{
          fontSize: '56px',
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 1.15,
          margin: '0 80px 12px',
          zIndex: 1,
          letterSpacing: '-1px',
        }}>
          AI 건축 사전기획 플랫폼
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '22px',
          color: '#94a3b8',
          textAlign: 'center',
          margin: '0 100px 36px',
          zIndex: 1,
          lineHeight: 1.5,
        }}>
          주소만 입력하면 5분 안에 완료
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '10px', zIndex: 1, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px' }}>
          {['🔍 대지 분석', '📐 법규 검토', '🏢 배치안 설계', '💰 사업성 분석', '🎨 AI 렌더링', '📄 PDF 보고서'].map((label) => (
            <div key={label} style={{
              padding: '8px 18px',
              borderRadius: '20px',
              background: 'rgba(94,234,212,0.1)',
              border: '1px solid rgba(94,234,212,0.2)',
              color: '#5eead4',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 1,
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
