import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

// POST: 공유 링크 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address, siteArea, zoneType, layoutName, snapshotData } = body

    if (!address || !snapshotData) {
      return NextResponse.json({ error: '주소와 프로젝트 데이터가 필요합니다' }, { status: 400 })
    }

    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('shared_snapshots')
      .insert({
        address,
        site_area: siteArea,
        zone_type: zoneType,
        layout_name: layoutName,
        snapshot_data: snapshotData,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[share] Supabase error:', error)
      return NextResponse.json({ error: '공유 링크 생성 실패' }, { status: 500 })
    }

    const shareUrl = `/share/${data.id}`
    
    return NextResponse.json({ 
      success: true, 
      id: data.id,
      shareUrl,
    })
  } catch (error) {
    console.error('[share] Error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// GET: 공유 데이터 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id 파라미터 필요' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('shared_snapshots')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '공유 프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 조회수 증가
    await supabase
      .from('shared_snapshots')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      id: data.id,
      address: data.address,
      siteArea: data.site_area,
      zoneType: data.zone_type,
      layoutName: data.layout_name,
      snapshotData: data.snapshot_data,
      viewCount: data.view_count + 1,
      createdAt: data.created_at,
    })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
