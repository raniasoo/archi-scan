import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const grid = Math.min(parseInt(searchParams.get('grid') || '12'), 20)
  const range = Math.min(parseFloat(searchParams.get('range') || '0.004'), 0.01)

  const lats: string[] = [], lngs: string[] = []
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      lats.push((lat + range - (gy / (grid - 1)) * range * 2).toFixed(6))
      lngs.push((lng - range + (gx / (grid - 1)) * range * 2).toFixed(6))
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lngs.join(',')}`
    const r = await fetch(url, { headers: { 'User-Agent': 'ArchiScan/1.0' } })
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`)
    const d = await r.json()
    return NextResponse.json({
      success: true, grid,
      elevations: d.elevation || [],
      min: Math.min(...(d.elevation || [0])),
      max: Math.max(...(d.elevation || [0])),
    }, { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, elevations: [] })
  }
}
