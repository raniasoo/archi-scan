import { NextRequest, NextResponse } from 'next/server'

// 임시 DNS 설정 API — 사용 후 삭제
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const VERCEL_TOKEN = process.env.VERCEL_DNS_TOKEN || ''
const DOMAIN = 'archiscan.kr'
const TEAM_ID = 'team_FHVE6yFVkT7HTOsnRzV9UZnr'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const resendKey = req.nextUrl.searchParams.get('rk') || process.env.RESEND_API_KEY || ''
  const vercelToken = req.nextUrl.searchParams.get('vt') || process.env.VERCEL_DNS_TOKEN || ''
  if (secret !== 'setup-dns-2026' || !resendKey || !vercelToken) {
    return NextResponse.json({ error: 'unauthorized or missing keys' }, { status: 403 })
  }

  const results: any[] = []

  try {
    // 1. Resend에서 도메인 DNS 레코드 가져오기
    const resendRes = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${resendKey}` },
    })
    const resendData = await resendRes.json()
    
    const domain = resendData.data?.find((d: any) => d.name === DOMAIN)
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found in Resend', domains: resendData })
    }

    results.push({ step: 'resend_domain', id: domain.id, status: domain.status })

    // 도메인 상세 정보 (DNS 레코드 포함)
    const detailRes = await fetch(`https://api.resend.com/domains/${domain.id}`, {
      headers: { 'Authorization': `Bearer ${resendKey}` },
    })
    const detail = await detailRes.json()
    
    results.push({ step: 'resend_detail', records_count: detail.records?.length })

    // 2. Vercel DNS에 레코드 추가
    const records = detail.records || []
    
    for (const rec of records) {
      // rec: { record, name, type, ttl, status, value, priority }
      const dnsRecord: any = {
        name: rec.name || '',
        type: rec.type?.toUpperCase() || 'TXT',
        value: rec.value || '',
        ttl: typeof rec.ttl === 'number' ? rec.ttl : 60,
      }
      
      // MX 레코드는 priority 필요
      if (rec.type?.toUpperCase() === 'MX') {
        dnsRecord.mxPriority = typeof rec.priority === 'number' ? rec.priority : 10
      }

      try {
        const vercelRes = await fetch(
          `https://api.vercel.com/v2/domains/${DOMAIN}/records?teamId=${TEAM_ID}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dnsRecord),
          }
        )
        const vercelData = await vercelRes.json()
        results.push({
          step: 'vercel_dns_add',
          record: `${rec.type} ${rec.name}`,
          success: vercelRes.ok,
          data: vercelData,
        })
      } catch (e) {
        results.push({
          step: 'vercel_dns_add',
          record: `${rec.type} ${rec.name}`,
          success: false,
          error: e instanceof Error ? e.message : 'unknown',
        })
      }
    }

    // 3. Resend에서 도메인 검증 트리거
    try {
      const verifyRes = await fetch(`https://api.resend.com/domains/${domain.id}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}` },
      })
      results.push({ step: 'resend_verify', status: verifyRes.status })
    } catch {}

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'unknown',
      results 
    })
  }
}
