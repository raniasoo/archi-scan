import { NextRequest, NextResponse } from 'next/server'
import { matchPatterns, buildPatternPrompt } from '@/lib/pattern-matcher'

// GET /api/test-patterns?type=courtyard&floors=2&units=1
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'courtyard'
  const floors = parseInt(req.nextUrl.searchParams.get('floors') || '2')
  const units = parseInt(req.nextUrl.searchParams.get('units') || '1')
  const siteArea = parseFloat(req.nextUrl.searchParams.get('siteArea') || '593')
  const coverage = parseFloat(req.nextUrl.searchParams.get('coverage') || '50')

  const result = await matchPatterns({ type, floors, units, siteArea, coverage })
  const prompt = buildPatternPrompt(result, 15)

  return NextResponse.json({
    summary: result.summary,
    matched: result.matched,
    total: result.total,
    byScale: {
      town: result.patterns.filter(p => p.scale === 'town').length,
      building: result.patterns.filter(p => p.scale === 'building').length,
      construction: result.patterns.filter(p => p.scale === 'construction').length,
    },
    top10: result.patterns.slice(0, 10).map(p => ({
      id: p.id, name: `#${p.id} ${p.name_kr}`, reason: p.match_reason, relevance: p.korea_relevance,
    })),
    propertyScores: result.propertyScores,
    promptPreview: prompt.slice(0, 500) + '...',
  })
}
