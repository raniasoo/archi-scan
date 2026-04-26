import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const KEY  = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const DOM  = 'v0-archi-scan-layout-generator.vercel.app'
const PNU  = '1111018300105300015'

function calcAreaM2(ring: number[][]): number {
  const lat0 = ring.reduce((s,c)=>s+c[1],0)/ring.length
  const lngS = Math.cos(lat0*Math.PI/180)*111319
  const latS = 111319
  let a=0
  for(let i=0;i<ring.length-1;i++) a += (ring[i][0]*lngS)*(ring[i+1][1]*latS) - (ring[i+1][0]*lngS)*(ring[i][1]*latS)
  return Math.abs(a/2)
}

export async function GET() {
  const params = new URLSearchParams({
    service:'data', request:'GetFeature', data:'LP_PA_CBND_BUBUN',
    key:KEY, domain:DOM, geometry:'true', attribute:'true',
    page:'1', size:'10', crs:'EPSG:4326', format:'json',
    attrFilter:`pnu:=:${PNU}`,
  })
  const r = await fetch(`https://api.vworld.kr/req/data?${params}`, {signal:AbortSignal.timeout(12000)})
  const j = await r.json()
  const features = j?.response?.result?.featureCollection?.features || []
  
  let totalArea = 0
  const info = features.map((f:Record<string,unknown>) => {
    const geom = f?.geometry as Record<string,unknown>
    let ring: number[][] = []
    if (geom?.type==='MultiPolygon') ring = (geom.coordinates as number[][][])?.[0]?.[0] || []
    else if (geom?.type==='Polygon') ring = (geom.coordinates as number[][])?.[0] || []
    const area = calcAreaM2(ring)
    totalArea += area
    const p = f?.properties as Record<string,unknown>
    return { jibun: p?.jibun, points: ring.length, area: Math.round(area) }
  })

  return NextResponse.json({ count: features.length, totalArea: Math.round(totalArea), features: info })
}
