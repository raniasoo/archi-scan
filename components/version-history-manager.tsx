"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  History,
  Save,
  Clock,
  MoreVertical,
  Trash2,
  Copy,
  Eye,
  GitCompare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowRight,
} from "lucide-react"
import {
  type ProjectVersion,
  type VersionComparisonResult,
  getProjectVersions,
  saveNewVersion,
  loadVersion,
  deleteVersion,
  duplicateVersion,
  updateVersionNote,
  compareVersions,
  formatVersionDate,
  getComparisonSummary,
  hasVersionHistory,
  initializeVersionHistory,
} from "@/lib/version-history-config"
import type { ProjectSnapshot } from "@/lib/project-storage"

// ============================================================================
// Types
// ============================================================================

interface VersionHistoryManagerProps {
  projectId: string
  projectName: string
  currentSnapshot: ProjectSnapshot | null
  onLoadVersion: (snapshot: ProjectSnapshot) => void
  onVersionSaved?: (version: ProjectVersion) => void
  canSaveVersion?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function VersionHistoryManager({
  projectId,
  projectName,
  currentSnapshot,
  onLoadVersion,
  onVersionSaved,
  canSaveVersion = true,
}: VersionHistoryManagerProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showSaveVersionDialog, setShowSaveVersionDialog] = useState(false)
  const [showCompareDialog, setShowCompareDialog] = useState(false)
  const [revisionNote, setRevisionNote] = useState("")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  
  // Compare mode state
  const [compareVersion1, setCompareVersion1] = useState<ProjectVersion | null>(null)
  const [compareVersion2, setCompareVersion2] = useState<ProjectVersion | null>(null)
  const [comparisonResult, setComparisonResult] = useState<VersionComparisonResult | null>(null)

  // Load versions on mount and when projectId changes
  useEffect(() => {
    if (projectId) {
      refreshVersions()
    }
  }, [projectId])

  const refreshVersions = () => {
    const vers = getProjectVersions(projectId)
    setVersions(vers)
  }

  const sortedVersions = [...versions].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // Initialize version history if needed
  const handleInitializeHistory = () => {
    if (!currentSnapshot) return
    
    const version = initializeVersionHistory(projectId, currentSnapshot)
    refreshVersions()
    onVersionSaved?.(version)
  }

  // Save new version
  const handleSaveVersion = () => {
    if (!currentSnapshot) {
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    
    try {
      const version = saveNewVersion(projectId, currentSnapshot, revisionNote || undefined)
      setSaveStatus('success')
      refreshVersions()
      onVersionSaved?.(version)
      
      setTimeout(() => {
        setShowSaveVersionDialog(false)
        setRevisionNote("")
        setSaveStatus('idle')
      }, 1000)
    } catch {
      setSaveStatus('error')
    }
  }

  // Load a version
  const handleLoadVersion = (versionId: string) => {
    const version = loadVersion(projectId, versionId)
    if (version) {
      onLoadVersion(version.snapshot)
      setShowHistoryDialog(false)
    }
  }

  // Delete a version
  const handleDeleteVersion = (versionId: string) => {
    if (confirm('이 버전을 삭제하시겠습니까?')) {
      deleteVersion(projectId, versionId)
      refreshVersions()
    }
  }

  // Duplicate a version
  const handleDuplicateVersion = (versionId: string) => {
    duplicateVersion(projectId, versionId)
    refreshVersions()
  }

  // Start compare mode
  const handleStartCompare = (version: ProjectVersion) => {
    setCompareVersion1(version)
    setCompareVersion2(null)
    setComparisonResult(null)
  }

  // Select second version for compare
  const handleSelectCompareVersion = (version: ProjectVersion) => {
    if (!compareVersion1) return
    
    setCompareVersion2(version)
    const result = compareVersions(compareVersion1, version)
    setComparisonResult(result)
    setShowCompareDialog(true)
  }

  // Reset compare mode
  const handleResetCompare = () => {
    setCompareVersion1(null)
    setCompareVersion2(null)
    setComparisonResult(null)
  }

  const hasVersions = versions.length > 0

  return (
    <>
      {/* Main Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden md:inline">버전 관리</span>
            {hasVersions && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {versions.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={() => setShowSaveVersionDialog(true)} 
            disabled={!currentSnapshot || !canSaveVersion}
          >
            <Save className="mr-2 h-4 w-4" />
            새 버전으로 저장
            {!canSaveVersion && (
              <span className="ml-auto text-xs text-muted-foreground">(읽기 전용)</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowHistoryDialog(true)}>
            <Clock className="mr-2 h-4 w-4" />
            버전 기록 보기
            {hasVersions && (
              <Badge variant="outline" className="ml-auto text-xs">
                {versions.length}
              </Badge>
            )}
          </DropdownMenuItem>
          {!hasVersions && currentSnapshot && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleInitializeHistory}>
                <FileText className="mr-2 h-4 w-4" />
                버전 기록 시작
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Version Dialog */}
      <Dialog open={showSaveVersionDialog} onOpenChange={setShowSaveVersionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              새 버전으로 저장
            </DialogTitle>
            <DialogDescription>
              현재 상태를 새 버전으로 저장합니다. ({projectName})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">버전 메모 (선택)</label>
              <Textarea
                placeholder="이 버전에 대한 메모를 입력하세요..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                예: 토지비 조정, 배치안 변경, 규모 검토 등
              </p>
            </div>
            
            {hasVersions && (
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-sm text-muted-foreground">
                  현재 버전: <span className="font-medium">v{versions.length}</span>
                  {' → '}
                  새 버전: <span className="font-medium text-foreground">v{versions.length + 1}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveVersionDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveVersion}
              disabled={saveStatus === 'saving' || !currentSnapshot}
            >
              {saveStatus === 'saving' ? (
                '저장 중...'
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  저장됨
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={(open) => {
        setShowHistoryDialog(open)
        if (!open) handleResetCompare()
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              버전 기록
            </DialogTitle>
            <DialogDescription>
              {projectName} - 총 {versions.length}개 버전
            </DialogDescription>
          </DialogHeader>
          
          {/* Compare mode indicator */}
          {compareVersion1 && !compareVersion2 && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm">
                <GitCompare className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 dark:text-blue-300">
                  비교할 두 번째 버전을 선택하세요
                </span>
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">
                  {compareVersion1.label}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetCompare}>
                취소
              </Button>
            </div>
          )}

          {/* Sort toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="gap-2"
            >
              {sortOrder === 'newest' ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                  최신순
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4" />
                  오래된순
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {sortedVersions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">버전 기록이 없습니다</p>
                {currentSnapshot && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={handleInitializeHistory}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    버전 기록 시작
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {sortedVersions.map((version, idx) => {
                  const isCompareSource = compareVersion1?.versionId === version.versionId
                  const isSelectingCompare = compareVersion1 && !compareVersion2 && !isCompareSource
                  
                  return (
                    <div
                      key={version.versionId}
                      className={`group relative rounded-lg border p-4 transition-colors ${
                        isCompareSource 
                          ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20' 
                          : isSelectingCompare
                            ? 'border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
                            : 'hover:bg-secondary/50'
                      }`}
                      onClick={isSelectingCompare ? () => handleSelectCompareVersion(version) : undefined}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={idx === 0 && sortOrder === 'newest' ? 'default' : 'secondary'}
                              className="font-mono"
                            >
                              {version.label}
                            </Badge>
                            {idx === 0 && sortOrder === 'newest' && (
                              <Badge variant="outline" className="text-xs">최신</Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatVersionDate(version.createdAt)}
                          </p>
                          
                          {version.revisionNote && (
                            <p className="text-sm text-muted-foreground bg-secondary/30 rounded px-2 py-1">
                              {version.revisionNote}
                            </p>
                          )}
                          
                          {/* Snapshot summary */}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{version.snapshot?.address || '주소 없음'}</span>
                            <span>·</span>
                            <span>{(version.snapshot?.siteArea || 0).toLocaleString()}㎡</span>
                            <span>·</span>
                            <span>ROI {(version.snapshot?.financials?.roi || 0).toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        {!isSelectingCompare && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleLoadVersion(version.versionId)}>
                                <Eye className="mr-2 h-4 w-4" />
                                이 버전 불러오기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStartCompare(version)}>
                                <GitCompare className="mr-2 h-4 w-4" />
                                다른 버전과 비교
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDuplicateVersion(version.versionId)}>
                                <Copy className="mr-2 h-4 w-4" />
                                복제
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteVersion(version.versionId)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={(open) => {
        setShowCompareDialog(open)
        if (!open) handleResetCompare()
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              버전 비교
            </DialogTitle>
            {comparisonResult && (
              <DialogDescription>
                {comparisonResult.version1Label} → {comparisonResult.version2Label}
                {' · '}
                {getComparisonSummary(comparisonResult)}
              </DialogDescription>
            )}
          </DialogHeader>

          {comparisonResult && (
            <ScrollArea className="h-[500px] pr-4">
              {/* Version Headers */}
              <div className="grid grid-cols-3 gap-4 mb-4 sticky top-0 bg-background pb-2 border-b">
                <div className="font-medium text-sm">항목</div>
                <div className="text-center">
                  <Badge variant="outline">{comparisonResult.version1Label}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatVersionDate(comparisonResult.timestamp1)}
                  </p>
                </div>
                <div className="text-center">
                  <Badge>{comparisonResult.version2Label}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatVersionDate(comparisonResult.timestamp2)}
                  </p>
                </div>
              </div>

              {comparisonResult.changes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">두 버전간 변경 사항이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Group by category */}
                  {(['basic', 'regulation', 'layout', 'financial', 'conclusion'] as const).map(category => {
                    const categoryChanges = comparisonResult.changes.filter(c => c.category === category)
                    if (categoryChanges.length === 0) return null
                    
                    const categoryLabels: Record<string, string> = {
                      basic: '기본 정보',
                      regulation: '법규 검토',
                      layout: '배치안',
                      financial: '사업성 분석',
                      conclusion: '결론',
                    }
                    
                    return (
                      <div key={category} className="mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 sticky top-12 bg-background py-1">
                          {categoryLabels[category]}
                        </h4>
                        {categoryChanges.map((change, idx) => (
                          <div
                            key={idx}
                            className={`grid grid-cols-3 gap-4 py-2 px-3 rounded-lg ${
                              change.importance === 'high'
                                ? 'bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-400'
                                : 'bg-secondary/30'
                            }`}
                          >
                            <div className="text-sm font-medium flex items-center gap-2">
                              {change.fieldLabel}
                              {change.importance === 'high' && (
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground text-center truncate">
                              {String(change.oldValue ?? '-')}
                            </div>
                            <div className="text-sm text-center flex items-center justify-center gap-2">
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium truncate">
                                {String(change.newValue ?? '-')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              닫기
            </Button>
            {compareVersion2 && (
              <Button onClick={() => handleLoadVersion(compareVersion2.versionId)}>
                <Eye className="mr-2 h-4 w-4" />
                {compareVersion2.label} 불러오기
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Re-export types for external use
export type { ProjectVersion, VersionComparisonResult }
