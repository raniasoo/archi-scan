import { NextRequest, NextResponse } from 'next/server'
import { fetchTerrainGrid } from '@/lib/terrain-fetcher'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '37.5665')
  const lng = parseFloat(searchParams.get('lng') || '126.978')
  const size = parseInt(searchParams.get('size') || '5')
  const area = parseInt(searchParams.get('area') || '100')

  try {
    const terrain = await fetchTerrainGrid({ lat, lng, gridSize: Math.min(size, 10), areaSize: Math.min(area, 500) })
    return NextResponse.json({ success: true, ...terrain })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
