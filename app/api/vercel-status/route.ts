import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    return NextResponse.json({ ok: false, error: 'VERCEL_TOKEN not set' }, { status: 500 })
  }
  try {
    const res = await fetch('https://api.vercel.com/v6/deployments?limit=3', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    const deployments = (data.deployments || []).map((d: Record<string,unknown>) => ({
      uid: d.uid,
      state: d.state,
      readyState: d.readyState,
      commit: (d.meta as Record<string,unknown>)?.githubCommitMessage,
      createdAt: d.createdAt,
    }))
    return NextResponse.json({ ok: true, deployments })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
