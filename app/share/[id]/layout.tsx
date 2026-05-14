import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase
      .from('shared_snapshots')
      .select('address, site_area, zone_type, layout_name, snapshot_data')
      .eq('id', id)
      .single()

    if (!data) {
      return { title: 'Archi-Scan 공유 프로젝트' }
    }

    const roi = data.snapshot_data?.feasibility?.roi
    const floors = data.snapshot_data?.selectedLayout?.floors
    const units = data.snapshot_data?.selectedLayout?.units
    
    const title = `${data.address} — ${data.layout_name || '배치안'} 사업성 분석`
    const description = [
      `📍 ${data.address}`,
      data.site_area ? `대지 ${Number(data.site_area).toLocaleString()}㎡` : null,
      floors ? `${floors}층` : null,
      units ? `${units}세대` : null,
      roi ? `ROI ${Number(roi).toFixed(1)}%` : null,
      'Archi-Scan AI 건축 사전기획',
    ].filter(Boolean).join(' · ')

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://www.archiscan.kr/share/${id}`,
        type: 'article',
        locale: 'ko_KR',
        siteName: 'Archi-Scan',
        images: [{
          url: `https://www.archiscan.kr/api/og?address=${encodeURIComponent(data.address)}&layout=${encodeURIComponent(data.layout_name || '')}&roi=${roi || ''}`,
          width: 1200,
          height: 630,
          alt: title,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    }
  } catch {
    return { title: 'Archi-Scan 공유 프로젝트' }
  }
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children
}
