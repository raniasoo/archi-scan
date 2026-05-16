"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import {
  Building2, ArrowLeft, Send, Loader2,
  CheckCircle2, Mail, User, MessageSquare,
  Paperclip, X, FileImage, FileText
} from "lucide-react"

const CATEGORIES = [
  { value: "일반", label: "일반 문의" },
  { value: "결제", label: "결제 / 환불" },
  { value: "기능", label: "기능 요청" },
  { value: "버그", label: "버그 신고" },
  { value: "제휴", label: "제휴 / 협업" },
]

const MAX_FILES = 3
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface AttachedFile {
  file: File
  preview?: string // data URL for images
}

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("일반")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setError("")
    
    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}이(가) 10MB를 초과합니다`)
        return
      }
    }
    
    const remaining = MAX_FILES - files.length
    const toAdd = selected.slice(0, remaining)
    
    const newFiles: AttachedFile[] = toAdd.map(file => {
      const entry: AttachedFile = { file }
      if (file.type.startsWith('image/')) {
        entry.preview = URL.createObjectURL(file)
      }
      return entry
    })
    
    setFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const removed = prev[index]
      if (removed.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const handleSubmit = async () => {
    if (!email) { setError("이메일을 입력해 주세요"); return }
    if (!message) { setError("문의 내용을 입력해 주세요"); return }
    setError("")
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("email", email)
      formData.append("category", category)
      formData.append("message", message)
      files.forEach(f => formData.append("files", f.file))

      const res = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(data.error || "문의 접수에 실패했습니다")
      }
    } catch {
      setError("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="max-w-sm w-full text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">문의가 접수되었습니다</h1>
          <p className="text-sm text-muted-foreground mb-6">
            빠른 시일 내에 {email}로 답변 드리겠습니다
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-5 h-14">
          <Link href="/landing" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Archi-Scan</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-1">문의하기</h1>
        <p className="text-sm text-muted-foreground mb-8">궁금한 점이나 건의사항을 남겨주세요. 빠르게 답변 드리겠습니다.</p>

        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">이름 (선택)</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* 이메일 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">이메일 <span className="text-destructive">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* 문의 유형 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">문의 유형</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    category === c.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 문의 내용 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">문의 내용 <span className="text-destructive">*</span></label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="문의 내용을 자유롭게 작성해 주세요"
                rows={5}
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* 파일 첨부 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              파일 첨부 <span className="text-muted-foreground/60">(선택, 최대 {MAX_FILES}개)</span>
            </label>
            
            {/* 첨부된 파일 목록 */}
            {files.length > 0 && (
              <div className="space-y-2 mb-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                    {f.preview ? (
                      <img src={f.preview} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{f.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(f.file.size)}</p>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-muted shrink-0">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* 파일 추가 버튼 */}
            {files.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Paperclip className="h-4 w-4" />
                스크린샷, 서류 첨부
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              이미지, PDF, 문서 파일 / 파일당 최대 10MB
            </p>
          </div>

          {/* 에러 */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* 제출 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "접수 중..." : "문의 보내기"}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            또는 <a href="mailto:contact@archiscan.kr" className="text-primary hover:underline">contact@archiscan.kr</a>로 직접 이메일을 보내실 수 있습니다
          </p>
        </div>
      </main>
    </div>
  )
}
