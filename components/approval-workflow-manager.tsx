"use client"

/**
 * Approval Workflow Manager Component
 * Extension Module - Does not modify frozen baseline
 * 
 * Features:
 * - Role-aware action visibility
 * - Approval status display
 * - Workflow transitions
 * - Approval history
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  Clock,
  FileText,
  Archive,
  Send,
  RotateCcw,
  History,
  User,
  Shield,
  ChevronDown,
  AlertCircle,
} from "lucide-react"
import {
  type UserRole,
  type ApprovalStatus,
  type CurrentUser,
  type ProjectApprovalData,
  type WorkflowTransition,
  USER_ROLES,
  APPROVAL_STATUSES,
  DEFAULT_USER,
  EMPTY_PROJECT_APPROVAL,
  getStoredUser,
  saveUser,
  getApproval,
  saveApproval,
  getAvailableTransitions,
  executeTransition,
  hasPermission,
  formatApprovalStatus,
  formatUserRole,
  isEditingAllowed,
} from "@/lib/user-roles-config"

interface ApprovalWorkflowManagerProps {
  projectId: string | null
  projectName?: string
  onApprovalChange?: (approval: ProjectApprovalData) => void
  onEditingStateChange?: (canEdit: boolean) => void
}

export function ApprovalWorkflowManager({
  projectId,
  projectName,
  onApprovalChange,
  onEditingStateChange,
}: ApprovalWorkflowManagerProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER)
  const [approval, setApproval] = useState<ProjectApprovalData>(EMPTY_PROJECT_APPROVAL)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showTransitionDialog, setShowTransitionDialog] = useState(false)
  const [selectedTransition, setSelectedTransition] = useState<WorkflowTransition | null>(null)
  const [transitionNote, setTransitionNote] = useState("")

  // Load user and approval state
  useEffect(() => {
    const storedUser = getStoredUser()
    setCurrentUser(storedUser)
  }, [])

  useEffect(() => {
    if (projectId) {
      const storedApproval = getApproval(projectId)
      if (storedApproval) {
        setApproval(storedApproval)
      } else {
        // Initialize approval for new project
        const newApproval: ProjectApprovalData = {
          ...EMPTY_PROJECT_APPROVAL,
          ownerId: currentUser.id,
          ownerName: currentUser.name,
        }
        setApproval(newApproval)
        saveApproval(projectId, newApproval)
      }
    }
  }, [projectId, currentUser.id, currentUser.name])

  // Notify parent of editing state changes
  useEffect(() => {
    const canEdit = isEditingAllowed(approval.approvalState.currentStatus, currentUser.role)
    onEditingStateChange?.(canEdit)
  }, [approval.approvalState.currentStatus, currentUser.role, onEditingStateChange])

  const handleRoleChange = (role: UserRole) => {
    const updatedUser = { ...currentUser, role }
    setCurrentUser(updatedUser)
    saveUser(updatedUser)
    setShowRoleDialog(false)
  }

  const handleTransition = (transition: WorkflowTransition) => {
    setSelectedTransition(transition)
    setTransitionNote("")
    setShowTransitionDialog(true)
  }

  const executeSelectedTransition = () => {
    if (!projectId || !selectedTransition) return

    const updatedApproval = executeTransition(
      projectId,
      selectedTransition,
      currentUser,
      transitionNote || undefined
    )
    setApproval(updatedApproval)
    onApprovalChange?.(updatedApproval)
    setShowTransitionDialog(false)
    setSelectedTransition(null)
    setTransitionNote("")
  }

  const availableTransitions = getAvailableTransitions(
    approval.approvalState.currentStatus,
    currentUser.role
  )

  const statusConfig = APPROVAL_STATUSES[approval.approvalState.currentStatus]
  const roleConfig = USER_ROLES[currentUser.role]

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />
      case 'under_review':
        return <Clock className="h-4 w-4" />
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'archived':
        return <Archive className="h-4 w-4" />
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'submit':
        return <Send className="h-4 w-4" />
      case 'approve':
        return <CheckCircle className="h-4 w-4" />
      case 'return':
        return <RotateCcw className="h-4 w-4" />
      case 'archive':
      case 'unarchive':
        return <Archive className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (!projectId) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">{roleConfig.labelKo}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>현재 역할</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(USER_ROLES).map((role) => (
            <DropdownMenuItem
              key={role.role}
              onClick={() => handleRoleChange(role.role)}
              className="gap-2"
            >
              <div className={`w-2 h-2 rounded-full ${role.color}`} />
              <span>{role.labelKo}</span>
              {currentUser.role === role.role && (
                <CheckCircle className="h-3 w-3 ml-auto text-green-500" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Approval Status Badge */}
      <Badge
        variant="outline"
        className={`gap-1.5 ${statusConfig.color} ${statusConfig.bgColor} ${statusConfig.borderColor}`}
      >
        {getStatusIcon(approval.approvalState.currentStatus)}
        <span>{statusConfig.labelKo}</span>
      </Badge>

      {/* Workflow Actions */}
      {availableTransitions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden md:inline">워크플로</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>승인 워크플로</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableTransitions.map((transition) => (
              <DropdownMenuItem
                key={`${transition.from}-${transition.to}`}
                onClick={() => handleTransition(transition)}
                className="gap-2"
              >
                {getActionIcon(transition.action)}
                <div className="flex flex-col">
                  <span>{transition.labelKo}</span>
                  <span className="text-xs text-muted-foreground">
                    {transition.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* History Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowHistoryDialog(true)}
        className="gap-2"
      >
        <History className="h-4 w-4" />
        <span className="hidden md:inline">이력</span>
      </Button>

      {/* Role Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">{roleConfig.labelKo}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>역할 변경 (테스트용)</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(USER_ROLES).map((role) => (
            <DropdownMenuItem
              key={role.role}
              onClick={() => handleRoleChange(role.role)}
              className="gap-2"
            >
              <div className={`w-2 h-2 rounded-full ${role.color}`} />
              <div className="flex flex-col flex-1">
                <span>{role.labelKo}</span>
                <span className="text-xs text-muted-foreground">{role.description}</span>
              </div>
              {currentUser.role === role.role && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Transition Dialog */}
      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTransition && getActionIcon(selectedTransition.action)}
              {selectedTransition?.labelKo}
            </DialogTitle>
            <DialogDescription>
              {selectedTransition?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className={APPROVAL_STATUSES[selectedTransition?.from || 'draft'].bgColor}>
                {formatApprovalStatus(selectedTransition?.from || 'draft')}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline" className={APPROVAL_STATUSES[selectedTransition?.to || 'draft'].bgColor}>
                {formatApprovalStatus(selectedTransition?.to || 'draft')}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">메모 (선택사항)</label>
              <Textarea
                placeholder="검토 의견이나 메모를 입력하세요..."
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransitionDialog(false)}>
              취소
            </Button>
            <Button onClick={executeSelectedTransition}>
              {selectedTransition?.labelKo} 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              승인 이력
            </DialogTitle>
            <DialogDescription>
              {projectName || '프로젝트'} - 승인 워크플로 이력
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4 pr-4">
              {/* Current Status */}
              <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(approval.approvalState.currentStatus)}
                    <div>
                      <p className="font-medium">{statusConfig.labelKo}</p>
                      <p className="text-xs text-muted-foreground">
                        현재 상태 · {new Date(approval.approvalState.lastUpdated).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  {approval.approvalState.approvedBy && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      승인자: {approval.approvalState.approvedBy}
                      {approval.approvalState.approvalNote && (
                        <span className="block mt-1 italic">
                          &quot;{approval.approvalState.approvalNote}&quot;
                        </span>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* History Timeline */}
              {approval.approvalState.history.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">워크플로 이력</h4>
                  {[...approval.approvalState.history].reverse().map((action, idx) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getActionIcon(action.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {formatApprovalStatus(action.fromStatus)} → {formatApprovalStatus(action.toStatus)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {action.userName} ({formatUserRole(action.userRole)}) · {new Date(action.timestamp).toLocaleString('ko-KR')}
                        </p>
                        {action.note && (
                          <p className="text-sm mt-1 text-muted-foreground italic">
                            &quot;{action.note}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">아직 승인 이력이 없습니다</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Export current user hook for use in other components
export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>(DEFAULT_USER)
  
  useEffect(() => {
    setUser(getStoredUser())
  }, [])
  
  return user
}

// Export permission check hook
export function usePermission(permission: string): boolean {
  const user = useCurrentUser()
  return hasPermission(user.role, permission as any)
}
