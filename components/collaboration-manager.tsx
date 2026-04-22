"use client"

/**
 * Collaboration Manager Component
 * 
 * Extension module UI for project sharing, review comments, and collaboration.
 * 
 * FROZEN BASELINE RULE: This component does NOT modify the locked report structure,
 * PDF layout, wording, Excel schema, or any other frozen modules.
 */

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Share2,
  MessageSquare,
  Link,
  Copy,
  Check,
  Trash2,
  Send,
  Clock,
  User,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ExternalLink,
  AlertCircle,
  UserPlus,
} from "lucide-react"

import {
  type ShareLink,
  type ReviewComment,
  type ReviewRequest,
  type ProjectCollaboration,
  type ShareAccessLevel,
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_DESCRIPTIONS,
  COMMENT_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  getProjectCollaboration,
  initializeCollaboration,
  generateShareLink,
  getShareLinkUrl,
  deactivateShareLink,
  deleteShareLink,
  isShareLinkValid,
  addComment,
  resolveComment,
  reopenComment,
  deleteComment,
  getOpenCommentCount,
  createReviewRequest,
  startReview,
  completeReview,
  declineReview,
  getPendingReviewRequests,
  formatRelativeTime,
  canUserComment,
} from "@/lib/collaboration-config"

import { getStoredUser } from "@/lib/user-roles-config"

// ============================================================================
// Props
// ============================================================================

interface CollaborationManagerProps {
  projectId: string | null
  projectName: string
  canEdit?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function CollaborationManager({
  projectId,
  projectName,
  canEdit = true,
}: CollaborationManagerProps) {
  const [collaboration, setCollaboration] = useState<ProjectCollaboration | null>(null)
  const [showMainDialog, setShowMainDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("share")
  
  // Share state
  const [newShareAccessLevel, setNewShareAccessLevel] = useState<ShareAccessLevel>("read_only")
  const [newShareLabel, setNewShareLabel] = useState("")
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  
  // Comment state
  const [newCommentText, setNewCommentText] = useState("")
  const [commentFilter, setCommentFilter] = useState<"all" | "open" | "resolved">("all")
  
  // Review request state
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewerName, setReviewerName] = useState("")
  const [reviewMessage, setReviewMessage] = useState("")
  const [responseNote, setResponseNote] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null)
  
  // Load collaboration data - currentUser accessed inside to avoid dependency issues
  const loadCollaboration = useCallback(() => {
    if (!projectId) return
    
    const user = getStoredUser()
    let collab = getProjectCollaboration(projectId)
    if (!collab && user) {
      collab = initializeCollaboration(projectId, user.id, user.name)
    }
    setCollaboration(collab)
  }, [projectId])
  
  useEffect(() => {
    loadCollaboration()
  }, [loadCollaboration])
  
  // Get current user for handlers (called only when needed, not during render)
  const getCurrentUser = useCallback(() => getStoredUser(), [])
  
  // ============================================================================
  // Share Link Handlers
  // ============================================================================
  
  const handleCreateShareLink = () => {
    const user = getCurrentUser()
    if (!projectId || !user) return
    
    generateShareLink(
      projectId,
      newShareAccessLevel,
      user.name,
      newShareLabel || undefined
    )
    setNewShareLabel("")
    loadCollaboration()
  }
  
  const handleCopyLink = async (linkId: string) => {
    const url = getShareLinkUrl(linkId)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLinkId(linkId)
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedLinkId(linkId)
      setTimeout(() => setCopiedLinkId(null), 2000)
    }
  }
  
  const handleDeactivateLink = (linkId: string) => {
    if (!projectId) return
    deactivateShareLink(projectId, linkId)
    loadCollaboration()
  }
  
  const handleDeleteLink = (linkId: string) => {
    if (!projectId) return
    deleteShareLink(projectId, linkId)
    loadCollaboration()
  }
  
  // ============================================================================
  // Comment Handlers
  // ============================================================================
  
  const handleAddComment = () => {
    const user = getCurrentUser()
    if (!projectId || !user || !newCommentText.trim()) return
    
    addComment(
      projectId,
      user.id,
      user.name,
      user.role,
      newCommentText.trim()
    )
    setNewCommentText("")
    loadCollaboration()
  }
  
  const handleResolveComment = (commentId: string) => {
    const user = getCurrentUser()
    if (!projectId || !user) return
    resolveComment(projectId, commentId, user.name)
    loadCollaboration()
  }
  
  const handleReopenComment = (commentId: string) => {
    if (!projectId) return
    reopenComment(projectId, commentId)
    loadCollaboration()
  }
  
  const handleDeleteComment = (commentId: string) => {
    if (!projectId) return
    deleteComment(projectId, commentId)
    loadCollaboration()
  }
  
  // ============================================================================
  // Review Request Handlers
  // ============================================================================
  
  const handleCreateReviewRequest = () => {
    const user = getCurrentUser()
    if (!projectId || !user || !reviewerName.trim()) return
    
    createReviewRequest(
      projectId,
      user.id,
      user.name,
      `reviewer-${Date.now()}`, // Simulated reviewer ID
      reviewerName.trim(),
      reviewMessage || undefined
    )
    setReviewerName("")
    setReviewMessage("")
    setShowReviewDialog(false)
    loadCollaboration()
  }
  
  const handleStartReview = (requestId: string) => {
    if (!projectId) return
    startReview(projectId, requestId)
    loadCollaboration()
  }
  
  const handleCompleteReview = () => {
    if (!projectId || !selectedRequest) return
    completeReview(projectId, selectedRequest.id, responseNote || undefined)
    setSelectedRequest(null)
    setResponseNote("")
    loadCollaboration()
  }
  
  const handleDeclineReview = () => {
    if (!projectId || !selectedRequest) return
    declineReview(projectId, selectedRequest.id, responseNote || undefined)
    setSelectedRequest(null)
    setResponseNote("")
    loadCollaboration()
  }
  
  // ============================================================================
  // Computed Values
  // ============================================================================
  
  const openCommentCount = projectId ? getOpenCommentCount(projectId) : 0
  const pendingReviews = projectId ? getPendingReviewRequests(projectId) : []
  const hasNotifications = openCommentCount > 0 || pendingReviews.length > 0
  
  const filteredComments = collaboration?.comments.filter(c => {
    if (commentFilter === "all") return true
    return c.status === commentFilter
  }) || []
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (!projectId) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Users className="h-4 w-4" />
        <span className="hidden sm:inline">협업</span>
      </Button>
    )
  }
  
  return (
    <>
      <Dialog open={showMainDialog} onOpenChange={setShowMainDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 relative"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">협업</span>
            {hasNotifications && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {openCommentCount + pendingReviews.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              프로젝트 협업
            </DialogTitle>
            <DialogDescription>
              {projectName} - 공유, 리뷰 코멘트, 검토 요청 관리
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="share" className="gap-2">
                <Share2 className="h-4 w-4" />
                공유
                {(collaboration?.shareLinks.filter(l => l.isActive).length || 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {collaboration?.shareLinks.filter(l => l.isActive).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                코멘트
                {openCommentCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {openCommentCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <Clock className="h-4 w-4" />
                검토 요청
                {pendingReviews.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-amber-100 text-amber-800">
                    {pendingReviews.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {/* Share Tab */}
            <TabsContent value="share" className="flex-1 overflow-hidden flex flex-col mt-4">
              {canEdit && (
                <Card className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">새 공유 링크 생성</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Select value={newShareAccessLevel} onValueChange={(v) => setNewShareAccessLevel(v as ShareAccessLevel)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="edit">{ACCESS_LEVEL_LABELS.edit}</SelectItem>
                          <SelectItem value="read_only">{ACCESS_LEVEL_LABELS.read_only}</SelectItem>
                          <SelectItem value="client_view">{ACCESS_LEVEL_LABELS.client_view}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="라벨 (선택)"
                        value={newShareLabel}
                        onChange={(e) => setNewShareLabel(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleCreateShareLink} size="sm">
                        <Link className="h-4 w-4 mr-2" />
                        생성
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ACCESS_LEVEL_DESCRIPTIONS[newShareAccessLevel]}
                    </p>
                  </CardContent>
                </Card>
              )}
              
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {collaboration?.shareLinks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">생성된 공유 링크가 없습니다</p>
                    </div>
                  ) : (
                    collaboration?.shareLinks.map(link => (
                      <Card key={link.id} className={!isShareLinkValid(link) ? "opacity-50" : ""}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={link.accessLevel === 'edit' ? 'default' : 'secondary'}>
                                  {ACCESS_LEVEL_LABELS[link.accessLevel]}
                                </Badge>
                                {!link.isActive && (
                                  <Badge variant="outline" className="text-muted-foreground">비활성</Badge>
                                )}
                                {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                                  <Badge variant="outline" className="text-red-600">만료됨</Badge>
                                )}
                              </div>
                              {link.label && (
                                <p className="text-sm font-medium truncate">{link.label}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {link.createdBy}이(가) {formatRelativeTime(link.createdAt)} 생성
                                {link.accessCount > 0 && ` · ${link.accessCount}회 접근`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopyLink(link.id)}
                                disabled={!isShareLinkValid(link)}
                              >
                                {copiedLinkId === link.id ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              {canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => window.open(getShareLinkUrl(link.id), '_blank')}>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      새 탭에서 열기
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {link.isActive && (
                                      <DropdownMenuItem onClick={() => handleDeactivateLink(link.id)}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        비활성화
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteLink(link.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      삭제
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Comments Tab */}
            <TabsContent value="comments" className="flex-1 overflow-hidden flex flex-col mt-4">
              {/* Add Comment */}
              {canUserComment(canEdit ? 'edit' : 'read_only') && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="리뷰 코멘트 작성..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <Select value={commentFilter} onValueChange={(v) => setCommentFilter(v as typeof commentFilter)}>
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="open">미해결</SelectItem>
                        <SelectItem value="resolved">해결됨</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAddComment} 
                      size="sm"
                      disabled={!newCommentText.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      등록
                    </Button>
                  </div>
                </div>
              )}
              
              <Separator className="mb-4" />
              
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {filteredComments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {commentFilter === "all" ? "코멘트가 없습니다" : 
                         commentFilter === "open" ? "미해결 코멘트가 없습니다" : "해결된 코멘트가 없습니다"}
                      </p>
                    </div>
                  ) : (
                    filteredComments.map(comment => (
                      <Card key={comment.id} className={comment.status === 'resolved' ? 'opacity-60' : ''}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{comment.authorName}</span>
                                <Badge variant="outline" className="text-xs">{comment.authorRole}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(comment.createdAt)}
                                </span>
                                {comment.status === 'resolved' && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    해결됨
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                              {comment.resolvedBy && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {comment.resolvedBy}이(가) {formatRelativeTime(comment.resolvedAt!)} 해결
                                </p>
                              )}
                            </div>
                            {canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {comment.status === 'open' ? (
                                    <DropdownMenuItem onClick={() => handleResolveComment(comment.id)}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      해결됨으로 표시
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleReopenComment(comment.id)}>
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                      다시 열기
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Reviews Tab */}
            <TabsContent value="reviews" className="flex-1 overflow-hidden flex flex-col mt-4">
              {canEdit && (
                <Button 
                  onClick={() => setShowReviewDialog(true)} 
                  className="mb-4"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  검토 요청하기
                </Button>
              )}
              
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {collaboration?.reviewRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">검토 요청이 없습니다</p>
                    </div>
                  ) : (
                    collaboration?.reviewRequests.map(request => (
                      <Card key={request.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={REVIEW_STATUS_COLORS[request.status]}>
                                  {REVIEW_STATUS_LABELS[request.status]}
                                </Badge>
                              </div>
                              <p className="text-sm">
                                <span className="font-medium">{request.requesterName}</span>
                                <span className="text-muted-foreground"> → </span>
                                <span className="font-medium">{request.reviewerName}</span>
                              </p>
                              {request.message && (
                                <p className="text-xs text-muted-foreground mt-1">{request.message}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatRelativeTime(request.createdAt)}
                                {request.completedAt && ` · 완료: ${formatRelativeTime(request.completedAt)}`}
                              </p>
                              {request.responseNote && (
                                <p className="text-xs mt-2 p-2 bg-secondary rounded">
                                  응답: {request.responseNote}
                                </p>
                              )}
                            </div>
                            {request.status === 'pending' && canEdit && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleStartReview(request.id)}
                                >
                                  검토 시작
                                </Button>
                              </div>
                            )}
                            {request.status === 'in_progress' && canEdit && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  검토 완료
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Create Review Request Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>검토 요청</DialogTitle>
            <DialogDescription>
              팀원에게 프로젝트 검토를 요청합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">검토자 이름</label>
              <Input
                placeholder="검토자 이름 입력"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">요청 메시지 (선택)</label>
              <Textarea
                placeholder="검토 요청 사항을 입력하세요..."
                value={reviewMessage}
                onChange={(e) => setReviewMessage(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              취소
            </Button>
            <Button onClick={handleCreateReviewRequest} disabled={!reviewerName.trim()}>
              <Send className="h-4 w-4 mr-2" />
              요청 보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Complete Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>검토 완료</DialogTitle>
            <DialogDescription>
              검토 결과를 기록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">검토 의견 (선택)</label>
              <Textarea
                placeholder="검토 의견을 입력하세요..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDeclineReview}>
              <XCircle className="h-4 w-4 mr-2" />
              거절
            </Button>
            <Button onClick={handleCompleteReview}>
              <CheckCircle className="h-4 w-4 mr-2" />
              검토 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
