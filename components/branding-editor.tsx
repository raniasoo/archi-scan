"use client"

import { useState, useRef } from "react"
import { Settings, Building2, User, Phone, Mail, MapPin, Globe, Image, X, Save, RotateCcw } from "lucide-react"
import { type BrandingConfig, DEFAULT_BRANDING, saveBrandingConfig } from "@/lib/branding-config"

interface BrandingEditorProps {
  branding: BrandingConfig
  onChange: (config: BrandingConfig) => void
  onClose: () => void
}

export function BrandingEditor({ branding, onChange, onClose }: BrandingEditorProps) {
  const [form, setForm] = useState<BrandingConfig>({ ...branding })
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (key: keyof BrandingConfig, value: string | number | undefined) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    saveBrandingConfig(form)
    onChange(form)
    onClose()
  }

  const handleReset = () => {
    setForm({ ...DEFAULT_BRANDING })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      alert('로고 파일은 500KB 이하여야 합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      update('logoBase64', base64)
    }
    reader.readAsDataURL(file)
  }

  const fields: { key: keyof BrandingConfig; label: string; icon: React.ReactNode; placeholder: string; required?: boolean }[] = [
    { key: 'brandName', label: '회사명', icon: <Building2 className="h-3.5 w-3.5" />, placeholder: 'Archi-Scan', required: true },
    { key: 'brandTagline', label: '태그라인', icon: <Building2 className="h-3.5 w-3.5" />, placeholder: '건축기획 분석 시스템' },
    { key: 'representativeName', label: '담당자', icon: <User className="h-3.5 w-3.5" />, placeholder: '홍길동', required: true },
    { key: 'representativeTitle', label: '직함', icon: <User className="h-3.5 w-3.5" />, placeholder: '대표' },
    { key: 'phone', label: '전화번호', icon: <Phone className="h-3.5 w-3.5" />, placeholder: '010-0000-0000', required: true },
    { key: 'email', label: '이메일', icon: <Mail className="h-3.5 w-3.5" />, placeholder: 'contact@company.com', required: true },
    { key: 'address', label: '주소', icon: <MapPin className="h-3.5 w-3.5" />, placeholder: '서울시 강남구 ...', required: true },
    { key: 'website', label: '웹사이트', icon: <Globe className="h-3.5 w-3.5" />, placeholder: 'https://www.company.com' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card rounded-t-xl">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">보고서 브랜딩 설정</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* 로고 업로드 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Image className="h-3.5 w-3.5" /> 로고 (선택)
            </label>
            <div className="flex items-center gap-3">
              {form.logoBase64 ? (
                <div className="relative">
                  <img src={form.logoBase64} alt="logo" className="h-10 max-w-[120px] object-contain rounded border border-border bg-white p-1" />
                  <button onClick={() => update('logoBase64', undefined)} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-white">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <div className="h-10 w-20 rounded border border-dashed border-border flex items-center justify-center">
                  <Image className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                {form.logoBase64 ? '변경' : '업로드'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">PNG/JPG, 500KB 이하 권장</p>
          </div>

          {/* 입력 필드 */}
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                {f.icon} {f.label} {f.required && <span className="text-destructive">*</span>}
              </label>
              <input
                type="text"
                value={(form[f.key] as string) || ''}
                onChange={e => update(f.key, e.target.value || undefined)}
                placeholder={f.placeholder}
                className="w-full h-8 px-3 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>

        {/* 미리보기 */}
        <div className="mx-4 mb-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
          <p className="text-[10px] text-muted-foreground mb-2">보고서 표지 미리보기</p>
          <div className="text-center space-y-0.5">
            {form.logoBase64 && <img src={form.logoBase64} alt="" className="h-6 mx-auto mb-1" />}
            <p className="text-xs font-bold text-foreground">{form.brandName || 'Archi-Scan'}</p>
            {form.brandTagline && <p className="text-[9px] text-muted-foreground">{form.brandTagline}</p>}
            <p className="text-[9px] text-muted-foreground">
              {form.representativeName} {form.representativeTitle && `· ${form.representativeTitle}`} · {form.phone}
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="sticky bottom-0 flex gap-2 p-4 border-t border-border bg-card rounded-b-xl">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 text-xs rounded border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-3 w-3" /> 초기화
          </button>
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Save className="h-3 w-3" /> 저장
          </button>
        </div>
      </div>
    </div>
  )
}
