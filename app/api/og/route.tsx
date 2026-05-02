import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'AI 건축 배치안 생성기'
  const subtitle = searchParams.get('subtitle') || '주소 입력만으로 건축 사업성을 분석합니다'

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
          position: 'relative',
        }}
      >
        {/* 배경 장식 */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(94, 234, 212, 0.08)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.06)',
            display: 'flex',
          }}
        />

        {/* 로고 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(20, 184, 166, 0.3)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12h4" />
              <path d="M10 8h4" />
              <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
              <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
              <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
            </svg>
          </div>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#5eead4', letterSpacing: '-0.5px' }}>
            Archi-Scan
          </span>
        </div>

        {/* 제목 */}
        <h1
          style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            margin: '0 60px 16px',
            letterSpacing: '-1px',
          }}
        >
          {title}
        </h1>

        {/* 부제목 */}
        <p
          style={{
            fontSize: '22px',
            color: '#94a3b8',
            textAlign: 'center',
            margin: '0 80px',
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>

        {/* 하단 태그 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '40px',
          }}
        >
          {['국토부 자동조회', 'AI 배치안', '사업성 분석', 'PDF 보고서'].map((tag) => (
            <div
              key={tag}
              style={{
                padding: '8px 20px',
                borderRadius: '24px',
                background: 'rgba(94, 234, 212, 0.12)',
                border: '1px solid rgba(94, 234, 212, 0.2)',
                color: '#5eead4',
                fontSize: '15px',
                fontWeight: 600,
                display: 'flex',
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* 워터마크 */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '32px',
            fontSize: '14px',
            color: 'rgba(148, 163, 184, 0.5)',
            display: 'flex',
          }}
        >
          archiscan.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
