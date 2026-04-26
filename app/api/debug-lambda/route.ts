import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// LP_PA_CBND_BUBUN 폴리곤 중심좌표 (평창동 530-15)
const LAT = 37.61269, LNG = 126.96799

export async function GET() {
  // Overpass: 반경 30m 내 landuse/building/parcel
  const q = `[out:json][timeout:10];(
    way(around:50,${LAT},${LNG})[landuse];
    way(around:30,${LAT},${LNG})[building];
    relation(around:30,${LAT},${LNG})[building];
  );out geom;`
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method:'POST', body:q, headers:{'Content-Type':'text/plain','User-Agent':'ArchiScan/1.0'},
      signal:AbortSignal.timeout(12000),
    })
    const d = await r.json()
    const els = d?.elements||[]
    return NextResponse.json({
      total: els.length,
      items: els.slice(0,5).map((e:Record<string,unknown>)=>({
        id:e.id, type:e.type, tags:e.tags,
        geom_len:(e.geometry as unknown[])?.length,
      }))
    })
  } catch(e:unknown) { return NextResponse.json({error:String(e)}) }
}
