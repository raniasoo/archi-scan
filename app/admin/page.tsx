"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  FileText, 
  Building2, 
  ArrowLeft,
  Crown,
  Calendar,
  MapPin,
  Download,
  TrendingUp,
  Eye,
  RefreshCw,
  Loader2
} from "lucide-react"
import {
  getAdminStats,
  getAllUsers,
  getAllReports,
  type User,
  type Report,
  type Project,
} from "@/lib/database"

export default function AdminPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  
  // Real data from Supabase
  const [stats, setStats] = useState({
    totalUsers: 0,
    proUsers: 0,
    totalProjects: 0,
    totalReports: 0,
    totalRevenue: 0,
  })
  const [users, setUsers] = useState<User[]>([])
  const [reports, setReports] = useState<Array<Report & { project?: Project; user?: User }>>([])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [adminStats, allUsers, allReports] = await Promise.all([
        getAdminStats(),
        getAllUsers(),
        getAllReports(),
      ])
      
      setStats({
        totalUsers: adminStats.totalUsers,
        proUsers: adminStats.proUsers,
        totalProjects: adminStats.totalProjects,
        totalReports: adminStats.totalReports,
        totalRevenue: adminStats.totalRevenue,
      })
      setUsers(allUsers)
      setReports(allReports)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    })
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg animate-pulse">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">메인으로</span>
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Archi-Scan 관리자</h1>
                  <p className="text-xs text-muted-foreground">사용자 및 보고서 관리</p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              새로고침
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4 hidden sm:block" />
              대시보드
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4 hidden sm:block" />
              사용자
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4 hidden sm:block" />
              보고서
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}명</div>
                  <p className="text-xs text-muted-foreground">
                    프로 {stats.proUsers}명 / 무료 {stats.totalUsers - stats.proUsers}명
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">프로 사용자</CardTitle>
                  <Crown className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.proUsers}명</div>
                  <p className="text-xs text-muted-foreground">
                    전환율 {stats.totalUsers > 0 ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(0) : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 보고서</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReports}건</div>
                  <p className="text-xs text-muted-foreground">
                    프로젝트 {stats.totalProjects}개
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 매출</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}원</div>
                  <p className="text-xs text-muted-foreground">
                    구독 결제 기준
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>최근 보고서</CardTitle>
                <CardDescription>최근 생성된 사업성 검토 보고서</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    아직 생성된 보고서가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.slice(0, 5).map((report) => (
                      <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{report.project?.address || report.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {report.project?.site_area ? `${report.project.site_area}㎡` : ''} · {report.doc_number}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-11 sm:ml-0">
                          <Badge variant="secondary" className="text-xs">
                            {formatDate(report.created_at)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>사용자 목록</CardTitle>
                <CardDescription>등록된 모든 사용자 ({users.length}명)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    아직 등록된 사용자가 없습니다.
                  </div>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="space-y-3 lg:hidden">
                      {users.map((user) => (
                        <div key={user.id} className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{user.name || '익명 사용자'}</p>
                                <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
                              </div>
                            </div>
                            <Badge 
                              variant={user.subscription_tier === "pro" ? "default" : "secondary"}
                              className={user.subscription_tier === "pro" ? "bg-amber-500 hover:bg-amber-600" : ""}
                            >
                              {user.subscription_tier === "pro" ? "프로" : "무료"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(user.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              사용 {user.usage_count}회
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">이름</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">이메일</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">플랜</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">가입일</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">사용 횟수</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b border-border last:border-0">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary">
                                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-medium">{user.name || '익명 사용자'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{user.email || '-'}</td>
                              <td className="py-3 px-4">
                                <Badge 
                                  variant={user.subscription_tier === "pro" ? "default" : "secondary"}
                                  className={user.subscription_tier === "pro" ? "bg-amber-500 hover:bg-amber-600" : ""}
                                >
                                  {user.subscription_tier === "pro" ? "프로" : "무료"}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{formatDate(user.created_at)}</td>
                              <td className="py-3 px-4">{user.usage_count}회</td>
                              <td className="py-3 px-4 text-right">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>보고서 목록</CardTitle>
                <CardDescription>생성된 모든 사업성 검토 보고서 ({reports.length}건)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    아직 생성된 보고서가 없습니다.
                  </div>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="space-y-3 lg:hidden">
                      {reports.map((report) => (
                        <div key={report.id} className="p-4 rounded-lg border border-border">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-medium text-sm">{report.project?.address || report.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {report.project?.site_area ? `${report.project.site_area}㎡` : ''} · {report.doc_number}
                              </p>
                            </div>
                            <Badge variant="outline">완료</Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {report.user?.name || '익명'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 gap-1">
                              <Eye className="h-3 w-3" />
                              보기
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 gap-1">
                              <Download className="h-3 w-3" />
                              다운로드
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">주소</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">면적</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">문서번호</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">작성자</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">작성일</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">상태</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((report) => (
                            <tr key={report.id} className="border-b border-border last:border-0">
                              <td className="py-3 px-4 font-medium max-w-[200px] truncate">
                                {report.project?.address || report.title}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {report.project?.site_area ? `${report.project.site_area}㎡` : '-'}
                              </td>
                              <td className="py-3 px-4">{report.doc_number}</td>
                              <td className="py-3 px-4 text-muted-foreground">{report.user?.name || '익명'}</td>
                              <td className="py-3 px-4 text-muted-foreground">{formatDate(report.created_at)}</td>
                              <td className="py-3 px-4">
                                <Badge variant="outline">완료</Badge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
