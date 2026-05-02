"use client"

import { createClient } from "@/lib/supabase/client"

export interface CloudProject {
  id: string
  name: string
  address: string
  siteArea: number
  zoneType?: string
  snapshotData: any
  updatedAt: string
  createdAt: string
}

// 로그인한 사용자의 Supabase user ID 가져오기
async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

// 클라우드에 프로젝트 저장 (upsert)
export async function saveProjectToCloud(
  projectData: {
    id?: string
    name: string
    address: string
    siteArea: number
    zoneType?: string
    designStrategy?: string
    snapshotData: any
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await getAuthUserId()
    if (!userId) return { success: false, error: 'not-logged-in' }

    const supabase = createClient()
    
    if (projectData.id) {
      // 기존 프로젝트 업데이트
      const { error } = await supabase
        .from('projects')
        .update({
          name: projectData.name,
          address: projectData.address,
          site_area: projectData.siteArea,
          zone_type: projectData.zoneType,
          design_strategy: projectData.designStrategy,
          snapshot_data: projectData.snapshotData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectData.id)
        .eq('user_id', userId)

      if (error) return { success: false, error: error.message }
      return { success: true, id: projectData.id }
    } else {
      // 새 프로젝트 생성
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: projectData.name,
          address: projectData.address,
          site_area: projectData.siteArea,
          zone_type: projectData.zoneType,
          design_strategy: projectData.designStrategy,
          snapshot_data: projectData.snapshotData,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, id: data?.id }
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// 클라우드에서 프로젝트 목록 가져오기
export async function getCloudProjects(limit = 20): Promise<CloudProject[]> {
  try {
    const userId = await getAuthUserId()
    if (!userId) return []

    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, address, site_area, zone_type, snapshot_data, updated_at, created_at')
      .eq('user_id', userId)
      .not('snapshot_data', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return data.map(p => ({
      id: p.id,
      name: p.name || p.address?.split(' ').slice(-2).join(' ') || '프로젝트',
      address: p.address,
      siteArea: p.site_area,
      zoneType: p.zone_type,
      snapshotData: p.snapshot_data,
      updatedAt: p.updated_at || p.created_at,
      createdAt: p.created_at,
    }))
  } catch {
    return []
  }
}

// 클라우드에서 프로젝트 삭제
export async function deleteCloudProject(projectId: string): Promise<boolean> {
  try {
    const userId = await getAuthUserId()
    if (!userId) return false

    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId)

    return !error
  } catch {
    return false
  }
}
