import { NextResponse } from 'next/server'

const API_KEY = process.env.DATA_GO_KR_API_KEY || process.env.MOLIT_API_KEY || ''
const API_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade'

const TESTS = [
  { name: '강남 역삼', code: '11680' },
  { name: '서초 서초동', code: '11650' },
  { name: '용산 한남동', code: '11170' },
  { name: '마포 합정동', code: '11440' },
  { name: '송파 잠실동', code: '11710' },
  { name: '성동 성수동', code: '11200' },
  { name: '강동 천호동', code: '11740' },
  { name: '영등포 여의도', code: '11560' },
  { name: '해운대 우동', code: '26350' },
  { name: '분당 정자동', code: '41135' },
]

async function query(code: string, ym: string) {
  if (!API_KEY) return { n: 0, e: 'NO_KEY' }
  try {
    const u = `${API_URL}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${code}&DEAL_YMD=${ym}&pageNo=1&numOfRows=30`
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) })
    if (!r.ok) return { n: 0, e: `H${r.status}` }
    const x = await r.text()
    if (x.includes('SERVICE_KEY_IS_NOT_REGISTERED')) return { n: 0, e: 'KEY_UNREG' }
    if (x.includes('UNAUTHORIZED')) return { n: 0, e: 'UNAUTH' }
    const items: any[] = []
    const re = /<item>([\s\S]*?)<\/item>/g
    let m
    while ((m = re.exec(x)) !== null) {
      const s = m[1]
      const v = (t: string) => { const z = s.match(new RegExp(`<${t}>([^<]*)</${t}`)); return z ? z[1].trim() : '' }
      const a = parseInt(v('dealAmount').replace(/,/g, '')) || 0
      const ar = parseFloat(v('dealArea')) || 0
      if (a > 0 && ar > 0) items.push({ a, ar, p: Math.round(a / ar), d: v('umdNm'), j: v('jibun'), dt: `${v('dealYear')}.${v('dealMonth')}.${v('dealDay')}`, lu: v('landUse'), jm: v('jimok') })
    }
    const cd = x.match(/<resultCode>(\d+)<\/resultCode>/)?.[1]
    const mg = x.match(/<resultMsg>([^<]*)<\/resultMsg>/)?.[1]
    return { n: items.length, items, e: items.length === 0 ? `${cd}:${mg}` : null }
  } catch (e: any) { return { n: 0, e: e.message?.substring(0, 40) } }
}

export async function GET() {
  const now = new Date()
  const ym1 = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const ym2 = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`
  const ym3 = (() => { const d = new Date(now.getFullYear(), now.getMonth() - 2, 1); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}` })()

  const out: any[] = []
  for (const t of TESTS) {
    const r1 = await query(t.code, ym1)
    const r2 = await query(t.code, ym2)
    const r3 = await query(t.code, ym3)
    const all = [...(r1.items || []), ...(r2.items || []), ...(r3.items || [])]
    if (all.length > 0) {
      const ps = all.map((i: any) => i.p).sort((a: number, b: number) => a - b)
      out.push({ ...t, src: 'REAL', cnt: all.length, avg: Math.round(ps.reduce((s: number, p: number) => s + p, 0) / ps.length), med: ps[Math.floor(ps.length / 2)], min: ps[0], max: ps[ps.length - 1], sample: all[0] })
    } else {
      out.push({ ...t, src: 'FAIL', cnt: 0, err: r1.e || r2.e || r3.e })
    }
  }
  return NextResponse.json({ ts: new Date().toISOString(), key: API_KEY ? `${API_KEY.substring(0, 8)}...` : 'NONE', ym: [ym1, ym2, ym3], results: out })
}
