"use client"

import { useState, useEffect, useRef } from "react"
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
import { 
  FolderOpen, 
  Save, 
  Clock, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Download, 
  Upload,
  FileJson,
  Edit2,
  ChevronDown,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import {
  saveProject,
  loadProject,
  deleteProject,
  getRecentProjects,
  hasRecentProjects,
  exportProjectAsJson,
  importProjectFromJson,
  renameProject,
  duplicateProject,
  type SavedProject,
  type ProjectSnapshot,
  type ProjectListItem,
} from "@/lib/project-storage"

// ============================================================================
// Types
// ============================================================================

interface ProjectManagerProps {
  currentSnapshot: ProjectSnapshot | null
  onLoad: (snapshot: ProjectSnapshot) => void
  onSaveSuccess?: (project: SavedProject) => void
  currentProjectId?: string
  canSave?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ProjectManager({ 
  currentSnapshot, 
  onLoad, 
  onSaveSuccess,
  currentProjectId,
  canSave = true 
}: ProjectManagerProps) {
  const [recentProjects, setRecentProjects] = useState<ProjectListItem[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load recent projects on mount
  useEffect(() => {
    setRecentProjects(getRecentProjects())
  }, [])

  // Refresh recent projects list
  const refreshProjects = () => {
    setRecentProjects(getRecentProjects())
  }

  // Handle save project
  const handleSave = () => {
    if (!currentSnapshot) {
      setErrorMessage("저장할 프로젝트 데이터가 없습니다.")
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    
    try {
      const name = projectName.trim() || `${currentSnapshot.address} 사업성검토`
      const saved = saveProject(currentSnapshot, currentProjectId, name)
      
      setSaveStatus('success')
      refreshProjects()
      onSaveSuccess?.(saved)
      
      setTimeout(() => {
        setShowSaveDialog(false)
        setSaveStatus('idle')
        setProjectName("")
      }, 1000)
    } catch (error) {
      setSaveStatus('error')
      setErrorMessage("프로젝트 저장에 실패했습니다.")
    }
  }

  // Handle load project
  const handleLoad = (projectId: string) => {
    const project = loadProject(projectId)
    
    if (project) {
      onLoad(project.data)
      setShowLoadDialog(false)
    } else {
      setErrorMessage("프로젝트를 불러올 수 없습니다.")
    }
  }

  // Handle delete project
  const handleDelete = (projectId: string) => {
    if (confirm("이 프로젝트를 삭제하시겠습니까?")) {
      deleteProject(projectId)
      refreshProjects()
    }
  }

  // Handle duplicate project
  const handleDuplicate = (projectId: string) => {
    duplicateProject(projectId)
    refreshProjects()
  }

  // Handle export project
  const handleExport = (projectId: string) => {
    const project = loadProject(projectId)
    if (project) {
      exportProjectAsJson(project)
    }
  }

  // Handle import project
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const project = await importProjectFromJson(file)
      refreshProjects()
      onLoad(project.data)
      setShowLoadDialog(false)
    } catch (error) {
      setErrorMessage("프로젝트 파일을 불러올 수 없습니다.")
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle rename project
  const handleRename = (projectId: string, currentName: string) => {
    const newName = prompt("새 프로젝트 이름을 입력하세요:", currentName)
    if (newName && newName.trim()) {
      renameProject(projectId, newName.trim())
      refreshProjects()
    }
  }

  // Format date for display
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format area
  const formatArea = (sqm: number) => {
    return `${sqm.toLocaleString()}m2 (${Math.round(sqm * 0.3025).toLocaleString()}평)`
  }

  return (
    <div className="flex items-center gap-2">
      {/* Save Button */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={!currentSnapshot || !canSave}
            title={!canSave ? "현재 상태에서는 저장할 수 없습니다" : undefined}
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">프로젝트 저장</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>프로젝트 저장</DialogTitle>
            <DialogDescription>
              현재 작업 중인 프로젝트를 저장합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">프로젝트 이름</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={currentSnapshot ? `${currentSnapshot.address} 사업성검토` : "프로젝트 이름"}
              />
            </div>
            
            {currentSnapshot && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>주소: {currentSnapshot.address || '주소 없음'}</p>
                <p>대지면적: {formatArea(currentSnapshot.siteArea || 0)}</p>
                <p>배치안: {(currentSnapshot.layouts || []).length}개</p>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}

            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                프로젝트가 저장되었습니다.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Button / Recent Projects */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">프로젝트 불러오기</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>프로젝트 불러오기</DialogTitle>
            <DialogDescription>
              저장된 프로젝트를 선택하거나 파일에서 불러옵니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Import from file */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <FileJson className="h-4 w-4" />
                JSON 파일에서 불러오기
              </Button>
            </div>

            {/* Recent Projects List */}
            {recentProjects.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  최근 프로젝트
                </h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {recentProjects.map((project) => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <button
                        onClick={() => handleLoad(project.id)}
                        className="flex-1 text-left"
                      >
                        <p className="font-medium text-sm truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(project.updatedAt)}
                        </p>
                      </button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleLoad(project.id)}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            열기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRename(project.id, project.name)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            이름 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(project.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            복제
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(project.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            JSON 내보내기
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>저장된 프로젝트가 없습니다.</p>
                <p className="text-sm">프로젝트를 저장하면 여기에 표시됩니다.</p>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Export Types
// ============================================================================

export type { ProjectSnapshot, SavedProject, ProjectListItem }
