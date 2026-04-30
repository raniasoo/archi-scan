"use client"

import { createClient } from "@/lib/supabase/client"

// Types
export interface User {
  id: string
  email: string | null
  name: string | null
  company: string | null
  subscription_tier: string
  usage_count: number
  created_at: string
}

export interface Project {
  id: string
  user_id: string | null
  address: string
  site_area: number
  zone_type: string | null
  design_strategy: string | null
  status: string
  created_at: string
}

export interface Layout {
  id: string
  project_id: string
  name: string
  type: string
  floors: number
  units: number
  coverage: number
  parking: number
  gfa: number | null
  scores: Record<string, number> | null
  is_recommended: boolean
  created_at: string
}

export interface Report {
  id: string
  project_id: string
  user_id: string | null
  doc_number: string
  title: string
  html_content: string | null
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  tier: string
  price: number
  payment_status: string
  created_at: string
}

// Fallback user for when DB is unavailable
const FALLBACK_USER: User = {
  id: 'local-user',
  email: null,
  name: null,
  company: null,
  subscription_tier: 'free',
  usage_count: 0,
  created_at: new Date().toISOString()
}

// Get or create anonymous user
export async function getOrCreateUser(): Promise<User> {
  try {
    const supabase = createClient()
    
    // 1. Supabase Auth 사용자 확인
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      // Auth 사용자가 있으면 users 테이블에서 조회/생성
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      if (existingUser) return existingUser as User

      // 첫 로그인 — users 테이블에 삽입
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.full_name || null,
          subscription_tier: 'free',
          usage_count: 0
        })
        .select()
        .single()
      
      if (!error && newUser) return newUser as User
    }

    // 2. 비로그인 — localStorage fallback
    let userId = typeof window !== 'undefined' ? localStorage.getItem('archiscan_user_id') : null
    
    if (userId && userId !== 'local-user') {
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && existingUser) return existingUser as User
    }
    
    // 3. 새 익명 사용자
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: null,
        name: null,
        subscription_tier: 'free',
        usage_count: 0
      })
      .select()
      .single()
    
    if (error) {
      if (typeof window !== 'undefined') localStorage.setItem('archiscan_user_id', 'local-user')
      return FALLBACK_USER
    }
    
    if (newUser && typeof window !== 'undefined') {
      localStorage.setItem('archiscan_user_id', newUser.id)
    }
    
    return newUser as User
  } catch (err) {
    console.error('[v0] getOrCreateUser error:', err)
    return FALLBACK_USER
  }
}

// 클라우드 프로젝트 목록 조회
export async function loadCloudProjects(): Promise<Project[]> {
  try {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return []

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) { console.error('[v0] loadCloudProjects error:', error); return [] }
    return (data || []) as Project[]
  } catch { return [] }
}

// Projects
export async function saveProject(data: {
  userId: string | null
  address: string
  siteArea: number
  zoneType?: string
  designStrategy?: string
}): Promise<Project> {
  // Generate fallback project
  const fallbackProject: Project = {
    id: `local-${Date.now()}`,
    user_id: data.userId,
    address: data.address,
    site_area: data.siteArea,
    zone_type: data.zoneType || null,
    design_strategy: data.designStrategy || null,
    status: 'active',
    created_at: new Date().toISOString()
  }

  try {
    const supabase = createClient()
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: data.userId === 'local-user' ? null : data.userId,
        address: data.address,
        site_area: data.siteArea,
        zone_type: data.zoneType,
        design_strategy: data.designStrategy,
        status: 'active'
      })
      .select()
      .single()
    
    if (error) {
      console.error('[v0] Supabase error saving project:', error.message, error.code, error.details)
      return fallbackProject
    }
    
    // Update user usage count (non-blocking)
    if (data.userId && data.userId !== 'local-user') {
      supabase
        .from('users')
        .update({ usage_count: 1 })
        .eq('id', data.userId)
        .then(() => {})
        .catch(() => {})
    }
    
    return project as Project
  } catch (err) {
    console.error('[v0] saveProject error:', err)
    return fallbackProject
  }
}

// Layouts
export async function saveLayouts(projectId: string, layouts: Array<{
  name: string
  type: string
  floors: number
  units: number
  coverage: number
  parking: number
  gfa?: number
  scores?: Record<string, number>
  isRecommended?: boolean
}>): Promise<Layout[]> {
  // Skip if local project
  if (projectId.startsWith('local-')) {
    console.log('[v0] Skipping layout save for local project')
    return []
  }

  try {
    const supabase = createClient()
    
    const layoutsToInsert = layouts.map(layout => ({
      project_id: projectId,
      name: layout.name,
      type: layout.type,
      floors: layout.floors,
      units: layout.units,
      coverage: layout.coverage,
      parking: layout.parking,
      gfa: layout.gfa,
      scores: layout.scores,
      is_recommended: layout.isRecommended || false
    }))
    
    const { data, error } = await supabase
      .from('layouts')
      .insert(layoutsToInsert)
      .select()
    
    if (error) {
      console.error('[v0] Supabase error saving layouts:', error.message, error.code, error.details)
      return []
    }
    
    return data as Layout[]
  } catch (err) {
    console.error('[v0] saveLayouts error:', err)
    return []
  }
}

// Reports
export async function saveReport(data: {
  projectId: string
  userId: string | null
  docNumber: string
  title: string
  htmlContent?: string
}): Promise<Report | null> {
  // Skip if local project
  if (data.projectId.startsWith('local-')) {
    console.log('[v0] Skipping report save for local project')
    return null
  }

  try {
    const supabase = createClient()
    
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        project_id: data.projectId,
        user_id: data.userId === 'local-user' ? null : data.userId,
        doc_number: data.docNumber,
        title: data.title,
        html_content: data.htmlContent
      })
      .select()
      .single()
    
    if (error) {
      console.error('[v0] Supabase error saving report:', error.message, error.code, error.details)
      return null
    }
    
    return report as Report
  } catch (err) {
    console.error('[v0] saveReport error:', err)
    return null
  }
}

// Admin queries
export async function getAdminStats(): Promise<{
  totalUsers: number
  proUsers: number
  totalProjects: number
  totalReports: number
  totalRevenue: number
  recentUsers: User[]
  recentReports: Array<Report & { project?: Project; user?: User }>
}> {
  const supabase = createClient()
  
  // Get users count
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  
  // Get pro users count
  const { count: proUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_tier', 'pro')
  
  // Get projects count
  const { count: totalProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
  
  // Get reports count
  const { count: totalReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
  
  // Get total revenue from subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('price')
    .eq('payment_status', 'completed')
  
  const totalRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.price || 0), 0) || 0
  
  // Get recent users
  const { data: recentUsers } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  // Get recent reports with project info
  const { data: recentReports } = await supabase
    .from('reports')
    .select(`
      *,
      project:projects(*),
      user:users(*)
    `)
    .order('created_at', { ascending: false })
    .limit(10)
  
  return {
    totalUsers: totalUsers || 0,
    proUsers: proUsers || 0,
    totalProjects: totalProjects || 0,
    totalReports: totalReports || 0,
    totalRevenue,
    recentUsers: (recentUsers || []) as User[],
    recentReports: (recentReports || []) as Array<Report & { project?: Project; user?: User }>
  }
}

// Get all users for admin
export async function getAllUsers(): Promise<User[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[v0] Supabase error fetching users:', error.message, error.code, error.details)
    return []
  }
  
  return data as User[]
}

// Get all reports for admin
export async function getAllReports(): Promise<Array<Report & { project?: Project; user?: User }>> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      project:projects(*),
      user:users(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[v0] Supabase error fetching reports:', error.message, error.code, error.details)
    return []
  }
  
  return data as Array<Report & { project?: Project; user?: User }>
}
