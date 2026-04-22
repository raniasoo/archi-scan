"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { 
  ImageIcon, 
  MapPin, 
  Camera, 
  X, 
  Upload, 
  Link as LinkIcon,
  Trash2,
  Edit2,
  Plus
} from "lucide-react"
import {
  type SiteVisualsConfig,
  type SiteImage,
  EMPTY_SITE_VISUALS,
  processUploadedImage,
  isValidImageUrl,
} from "@/lib/site-visuals-config"

interface SiteVisualsManagerProps {
  visuals: SiteVisualsConfig
  onChange: (visuals: SiteVisualsConfig) => void
}

export function SiteVisualsManager({ visuals, onChange }: SiteVisualsManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'map' | 'photos'>('map')
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [captionInput, setCaptionInput] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  
  const mapFileInputRef = useRef<HTMLInputElement>(null)
  const photoFileInputRef = useRef<HTMLInputElement>(null)

  // Handle site map upload
  const handleMapUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    try {
      const processed = await processUploadedImage(file, 1000, 800)
      onChange({
        ...visuals,
        siteMap: {
          ...processed,
          caption: captionInput || '대상지 위치도',
        },
      })
      setCaptionInput('')
    } catch (error) {
      console.error('Failed to process map image:', error)
    } finally {
      setIsUploading(false)
    }
  }, [visuals, onChange, captionInput])

  // Handle site map URL input
  const handleMapUrl = useCallback(() => {
    if (isValidImageUrl(urlInput)) {
      onChange({
        ...visuals,
        siteMap: {
          url: urlInput,
          caption: captionInput || '대상지 위치도',
          uploadedAt: new Date().toISOString(),
        },
      })
      setUrlInput('')
      setCaptionInput('')
    }
  }, [visuals, onChange, urlInput, captionInput])

  // Handle site photo upload
  const handlePhotoUpload = useCallback(async (file: File) => {
    if (visuals.sitePhotos.length >= 3) return
    
    setIsUploading(true)
    try {
      const processed = await processUploadedImage(file, 1000, 800)
      const newPhoto: SiteImage = {
        ...processed,
        caption: captionInput || `현장 사진 ${visuals.sitePhotos.length + 1}`,
      }
      onChange({
        ...visuals,
        sitePhotos: [...visuals.sitePhotos, newPhoto],
      })
      setCaptionInput('')
    } catch (error) {
      console.error('Failed to process photo:', error)
    } finally {
      setIsUploading(false)
    }
  }, [visuals, onChange, captionInput])

  // Handle site photo URL input
  const handlePhotoUrl = useCallback(() => {
    if (visuals.sitePhotos.length >= 3) return
    
    if (isValidImageUrl(urlInput)) {
      const newPhoto: SiteImage = {
        url: urlInput,
        caption: captionInput || `현장 사진 ${visuals.sitePhotos.length + 1}`,
        uploadedAt: new Date().toISOString(),
      }
      onChange({
        ...visuals,
        sitePhotos: [...visuals.sitePhotos, newPhoto],
      })
      setUrlInput('')
      setCaptionInput('')
    }
  }, [visuals, onChange, urlInput, captionInput])

  // Remove site map
  const handleRemoveMap = useCallback(() => {
    onChange({
      ...visuals,
      siteMap: undefined,
    })
  }, [visuals, onChange])

  // Remove site photo
  const handleRemovePhoto = useCallback((index: number) => {
    onChange({
      ...visuals,
      sitePhotos: visuals.sitePhotos.filter((_, i) => i !== index),
    })
  }, [visuals, onChange])

  // Update photo caption
  const handleUpdatePhotoCaption = useCallback((index: number, caption: string) => {
    const updated = [...visuals.sitePhotos]
    updated[index] = { ...updated[index], caption }
    onChange({
      ...visuals,
      sitePhotos: updated,
    })
    setEditingIndex(null)
  }, [visuals, onChange])

  // Clear all visuals
  const handleClearAll = useCallback(() => {
    onChange(EMPTY_SITE_VISUALS)
  }, [onChange])

  const hasVisuals = visuals.siteMap || visuals.sitePhotos.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ImageIcon className="h-4 w-4" />
          <span className="hidden sm:inline">
            {hasVisuals ? '현장 이미지 편집' : '현장 이미지 추가'}
          </span>
          <span className="sm:hidden">이미지</span>
          {hasVisuals && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 rounded">
              {(visuals.siteMap ? 1 : 0) + visuals.sitePhotos.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            현장 이미지 관리
          </DialogTitle>
          <DialogDescription>
            대상지 위치도와 현장 사진을 추가하여 보고서에 포함할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            variant={activeTab === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('map')}
            className="gap-2"
          >
            <MapPin className="h-4 w-4" />
            위치도
            {visuals.siteMap && <span className="ml-1 text-xs opacity-70">1</span>}
          </Button>
          <Button
            variant={activeTab === 'photos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('photos')}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            현장 사진
            {visuals.sitePhotos.length > 0 && (
              <span className="ml-1 text-xs opacity-70">{visuals.sitePhotos.length}/3</span>
            )}
          </Button>
        </div>

        {/* Site Map Tab */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            {visuals.siteMap ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="relative">
                    <img
                      src={visuals.siteMap.url}
                      alt={visuals.siteMap.caption || '대상지 위치도'}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={handleRemoveMap}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    {visuals.siteMap.caption || '대상지 위치도'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    대상지 위치도 이미지를 업로드하거나 URL을 입력하세요
                  </p>
                  <input
                    ref={mapFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleMapUpload(file)
                    }}
                  />
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => mapFileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      파일 업로드
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>또는 이미지 URL 입력</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <Button onClick={handleMapUrl} disabled={!urlInput}>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      추가
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>캡션 (선택)</Label>
                  <Input
                    placeholder="대상지 위치도"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Site Photos Tab */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {/* Existing Photos */}
            {visuals.sitePhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {visuals.sitePhotos.map((photo, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="p-2">
                      <div className="relative">
                        <img
                          src={photo.url}
                          alt={photo.caption || `현장 사진 ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <div className="absolute top-1 right-1 flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditingIndex(index)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemovePhoto(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {editingIndex === index ? (
                        <Input
                          className="mt-1 h-7 text-xs"
                          defaultValue={photo.caption}
                          onBlur={(e) => handleUpdatePhotoCaption(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdatePhotoCaption(index, e.currentTarget.value)
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground text-center truncate">
                          {photo.caption || `현장 사진 ${index + 1}`}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add Photo */}
            {visuals.sitePhotos.length < 3 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    현장 사진 추가 ({visuals.sitePhotos.length}/3)
                  </p>
                  <input
                    ref={photoFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePhotoUpload(file)
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => photoFileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    사진 추가
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>또는 이미지 URL 입력</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <Button onClick={handlePhotoUrl} disabled={!urlInput}>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      추가
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>캡션 (선택)</Label>
                  <Input
                    placeholder="현장 사진 설명"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={!hasVisuals}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            전체 삭제
          </Button>
          <Button onClick={() => setIsOpen(false)}>
            완료
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type { SiteVisualsConfig }
