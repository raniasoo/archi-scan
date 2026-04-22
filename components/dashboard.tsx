"use client"
// @version STABLE-v194 | @checkpoint release-candidate | 2026-04-10
import { useState, useEffect, useMemo, useCallback } from "react"
import { initializeDemoProjects } from "@/lib/demo-projects"
import { 
  LayoutDashboard, 
  FileText, 
  Clock, 
  CheckCircle, 
  Archive, 
  MessageSquare,
  GitBranch,
  TrendingUp,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  FolderOpen,
  Copy,
  Trash2,
  ExternalLink,
  AlertCircle,
  Building2,
  MapPin,
  Users,
  ChevronRight,
  RefreshCw,
  X,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type ProjectSummary,
  type DashboardStats,
  type DashboardFilters,
  type RecentActivity,
  type SortField,
  type SortOrder,
  type StatusFilter,
  DEFAULT_FILTERS,
  getAllProjectSummaries,
  getDashboardStats,
  getRecentActivity,
  filterAndSortProjects,
  getStatusLabel,
  getStatusColor,
  formatKRWCompact,
  formatDateRelative,
  duplicateProjectFull,
  toggleArchiveProject,
  deleteProjectComplete,
} from "@/lib/dashboard-config"
import { type ProjectSnapshot } from "@/components/project-manager"
import { loadProject } from "@/lib/project-storage"

// ============================================================================
// Props
// ============================================================================

interface DashboardProps {
  onOpenProject: (snapshot: ProjectSnapshot, projectId: string, projectName: string) => void
  onClose: () => void
  canEdit?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function Dashboard({ onOpenProject, onClose, canEdit = true }: DashboardProps) {
  // State
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  // Use a single state for delete dialog - null means closed, string means open with that project ID
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Load data function - defined before useEffect
  const loadData = useCallback(() => {
    setIsLoading(true)
    try {
      // Initialize demo projects on first load
      initializeDemoProjects()
      
      const allSummaries = getAllProjectSummaries() ?? []
      setSummaries(allSummaries)
      setRecentActivity(getRecentActivity(10) ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Computed values
  const stats = useMemo(() => getDashboardStats(summaries), [summaries])
  const filteredProjects = useMemo(
    () => filterAndSortProjects(summaries, filters),
    [summaries, filters]
  )
  
  // Handlers - use useCallback for stable references
  const handleOpenProject = useCallback((projectId: string) => {
    const project = loadProject(projectId)
    if (project && project.data) {
      onOpenProject(project.data, project.id, project.name || '이름 없음')
    }
  }, [onOpenProject])
  
  const handleDuplicate = useCallback((projectId: string) => {
    const duplicated = duplicateProjectFull(projectId)
    if (duplicated) {
      loadData()
    }
  }, [loadData])
  
  const handleToggleArchive = useCallback((projectId: string) => {
    toggleArchiveProject(projectId)
    loadData()
  }, [loadData])
  
  const handleDelete = () => {
    if (pendingDeleteId) {
      deleteProjectComplete(pendingDeleteId)
      setPendingDeleteId(null)
      loadData()
    }
  }
  
  const updateFilter = (key: keyof DashboardFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  const toggleSortOrder = () => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
  }
  
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }
  
  const hasActiveFilters = filters.status !== 'all' || (filters.search || '').trim() !== ''
  
  return (
    <div className="min-h-screen bg-background overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 shrink-0">
                <LayoutDashboard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-semibold">프로젝트 대시보드</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  전체 프로젝트 현황 및 관리
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading} className="px-2 md:px-3">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">새로고침</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onClose} className="px-2 md:px-3">
                <Home className="h-4 w-4 sm:hidden" />
                <X className="h-4 w-4 hidden sm:block" />
                <span className="hidden sm:inline ml-2">닫기</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 overflow-x-hidden">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                  <p className="text-xs text-muted-foreground">전체 프로젝트</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.draftCount}</p>
                  <p className="text-xs text-muted-foreground">초안</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.underReviewCount}</p>
                  <p className="text-xs text-muted-foreground">검토 중</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approvedCount}</p>
                  <p className="text-xs text-muted-foreground">승인됨</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.averageROI.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">평균 ROI</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalOpenComments + stats.totalPendingReviews}</p>
                  <p className="text-xs text-muted-foreground">대기 항목</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">프로젝트 목록</CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      필터 초기화
                    </Button>
                  )}
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="프로젝트명 또는 주소 검색..."
                      value={filters.search}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select
                    value={filters.status}
                    onValueChange={(value) => updateFilter('status', value as StatusFilter)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="under_review">검토 중</SelectItem>
                      <SelectItem value="approved">승인됨</SelectItem>
                      <SelectItem value="archived">보관됨</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filters.sortField}
                    onValueChange={(value) => updateFilter('sortField', value as SortField)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updatedAt">최근 수정</SelectItem>
                      <SelectItem value="createdAt">생성일</SelectItem>
                      <SelectItem value="name">이름</SelectItem>
                      <SelectItem value="roi">ROI</SelectItem>
                      <SelectItem value="profit">수익</SelectItem>
                      <SelectItem value="siteArea">면적</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                    {filters.sortOrder === 'asc' ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {filteredProjects.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {hasActiveFilters ? '검색 결과가 없습니다' : '저장된 프로젝트가 없습니다'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="group p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Clickable content area - opens project */}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleOpenProject(project.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleOpenProject(project.id) }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm truncate">{project.name}</h3>
                              <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(project.status)}`}>
                                {getStatusLabel(project.status)}
                              </Badge>
                              {project.openCommentCount > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {project.openCommentCount}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {project.address || '주소 미입력'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {project.selectedLayoutName} ({project.selectedLayoutFloors}F / {project.selectedLayoutUnits}세대)
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span className="text-muted-foreground">
                                {project.siteArea.toLocaleString()}㎡
                              </span>
                              <span className={project.roi > 15 ? 'text-emerald-600 font-medium' : project.roi > 10 ? 'text-blue-600' : 'text-amber-600'}>
                                ROI {project.roi.toFixed(1)}%
                              </span>
                              <span className="text-muted-foreground">
                                이익 {formatKRWCompact(project.profit)}
                              </span>
                              <span className="text-muted-foreground/70">
                                {formatDateRelative(project.updatedAt)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action buttons - direct buttons for reliable touch handling */}
                          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => handleOpenProject(project.id)}
                              title="열기"
                            >
                              <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => handleDuplicate(project.id)}
                                  title="복제"
                                >
                                  <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => handleToggleArchive(project.id)}
                                  title={project.status === 'archived' ? '보관 해제' : '보관'}
                                >
                                  <Archive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                                  onClick={() => setPendingDeleteId(project.id)}
                                  title="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  최근 활동
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    최근 활동이 없습니다
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 8).map((activity, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 text-sm cursor-pointer hover:bg-secondary/50 p-2 -mx-2 rounded-lg transition-colors"
                        onClick={() => handleOpenProject(activity.projectId)}
                      >
                        <div className={`mt-0.5 flex items-center justify-center w-6 h-6 rounded-full ${
                          activity.type === 'version' ? 'bg-blue-100' :
                          activity.type === 'comment' ? 'bg-purple-100' :
                          activity.type === 'review' ? 'bg-amber-100' :
                          'bg-emerald-100'
                        }`}>
                          {activity.type === 'version' && <GitBranch className="h-3 w-3 text-blue-600" />}
                          {activity.type === 'comment' && <MessageSquare className="h-3 w-3 text-purple-600" />}
                          {activity.type === 'review' && <Users className="h-3 w-3 text-amber-600" />}
                          {activity.type === 'approval' && <CheckCircle className="h-3 w-3 text-emerald-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{activity.projectName}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {formatDateRelative(activity.timestamp)}
                            {activity.author && ` · ${activity.author}`}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  재무 요약
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">평균 ROI</span>
                    <span className={`text-sm font-medium ${
                      stats.averageROI > 15 ? 'text-emerald-600' : 
                      stats.averageROI > 10 ? 'text-blue-600' : 'text-amber-600'
                    }`}>
                      {stats.averageROI.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">총 예상 수익</span>
                    <span className="text-sm font-medium">
                      {formatKRWCompact(stats.totalProfit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">열린 코멘트</span>
                    <span className="text-sm font-medium">{stats.totalOpenComments}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">대기 중 리뷰</span>
                    <span className="text-sm font-medium">{stats.totalPendingReviews}건</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Delete Confirmation Dialog - only rendered when pendingDeleteId is set */}
      {pendingDeleteId !== null && (
        <AlertDialog defaultOpen onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 프로젝트와 관련된 모든 데이터(버전 기록, 코멘트, 승인 기록)가 영구적으로 삭제됩니다.
                이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
