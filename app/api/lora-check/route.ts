import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const TOKEN = process.env.REPLICATE_API_TOKEN
export async function GET() {
  if (!TOKEN) return NextResponse.json({ error: 'no token' })
  try {
    const r = await fetch('https://api.replicate.com/v1/predictions?cursor=', {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    })
    const d = await r.json()
    const recent = (d.results || []).slice(0, 5).map((p: any) => ({
      id: p.id, status: p.status, model: p.model,
      created: p.created_at, started: p.started_at,
      completed: p.completed_at, error: p.error,
      output: p.output ? (typeof p.output === 'string' ? p.output.slice(0,100) : 'has output') : null,
    }))
    return NextResponse.json({ count: d.results?.length, recent })
  } catch (e) { return NextResponse.json({ error: String(e) }) }
}
