import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    services: {
      gemini: {
        name: '나노바나나 2 (Gemini)',
        role: '🎨 건축 렌더링',
        configured: !!process.env.GOOGLE_AI_API_KEY,
        endpoint: '/api/ai-render',
      },
      claude: {
        name: 'Claude (Anthropic)',
        role: '💬 설계 컨설팅',
        configured: !!process.env.ANTHROPIC_API_KEY,
        endpoint: '/api/ai-consult',
      },
      openai: {
        name: 'ChatGPT (OpenAI)',
        role: '📝 사업 제안서',
        configured: !!process.env.OPENAI_API_KEY,
        endpoint: '/api/ai-proposal',
      },
    },
    allConfigured: !!(process.env.GOOGLE_AI_API_KEY && process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString(),
  })
}
