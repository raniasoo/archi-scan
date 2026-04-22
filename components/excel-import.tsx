"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { parseExcelToReportData, reportDataToSummaryInput, EXCEL_SHEET_NAMES_OBJ as EXCEL_SHEET_NAMES } from "@/lib/report-excel-utils"

export interface ImportedReportData {
  address: string
  siteArea: number
  layout: {
    id: number
    name: string
    type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
    description: string
    coverage: number
    units: number
    floors: number
    parking: number
    features: string[]
  }
  layouts: Array<{
    id: number
    name: string
    type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
    description: string
    coverage: number
    units: number
    floors: number
    parking: number
    features: string[]
  }>
  gfa: number
  regulation?: {
    zoneType: string
    maxCoverageRatio: number
    maxFloorAreaRatio: number
    maxHeight: number
    maxFloors: number
    roadWidth: number
    roadCondition: string
    parkingRatio: number
    setbackType: string
    setbackAngle: number
    setbackFront: number
    setbackSide: number
    setbackRear: number
    additionalNotes: string
  }
}

interface ExcelImportProps {
  onImport: (data: ImportedReportData) => void
}

export function ExcelImport({ onImport }: ExcelImportProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [missingSheets, setMissingSheets] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setSuccess(false)
    setMissingSheets([])

    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer()
      
      // Parse Excel file
      const { data, missingSheets: missing, errors } = await parseExcelToReportData(buffer)
      
      // Check for missing required sheets
      const requiredSheets = [
        EXCEL_SHEET_NAMES.기본정보,
        EXCEL_SHEET_NAMES.선택안상세,
      ]
      
      const criticalMissing = missing.filter(sheet => requiredSheets.includes(sheet))
      
      if (criticalMissing.length > 0) {
        setMissingSheets(missing)
        setError(`필수 워크시트가 누락되었습니다: ${criticalMissing.join(", ")}`)
        setIsLoading(false)
        return
      }
      
      // Show warning for non-critical missing sheets
      if (missing.length > 0) {
        setMissingSheets(missing)
      }
      
      // Check for parsing errors
      if (errors.length > 0) {
        console.warn("[v0] Excel parsing warnings:", errors)
      }
      
      // Convert to ReportSummary input format
      const summaryInput = reportDataToSummaryInput(data)
      
      // Prepare imported data
      const importedData: ImportedReportData = {
        address: summaryInput.address,
        siteArea: summaryInput.siteArea,
        layout: {
          ...summaryInput.layout,
          type: summaryInput.layout.type as "tower" | "courtyard" | "lshape" | "linear" | "cluster",
        },
        layouts: (summaryInput.allLayouts || [summaryInput.layout]).map(l => ({
          ...l,
          type: l.type as "tower" | "courtyard" | "lshape" | "linear" | "cluster",
        })),
        gfa: summaryInput.gfa,
        regulation: summaryInput.regulation,
      }
      
      setSuccess(true)
      
      // Delay to show success state
      setTimeout(() => {
        onImport(importedData)
        setOpen(false)
        setSuccess(false)
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }, 800)
      
    } catch (err) {
      console.error("[v0] Excel import error:", err)
      setError(err instanceof Error ? err.message : "엑셀 파일 처리 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setError(null)
      setSuccess(false)
      setMissingSheets([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">엑셀 업로드</span>
          <span className="sm:hidden">업로드</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            엑셀 파일 업로드
          </DialogTitle>
          <DialogDescription>
            사업성 검토 데이터가 포함된 엑셀 파일(.xlsx)을 업로드하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Required sheets info */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">필수 워크시트:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>{EXCEL_SHEET_NAMES.기본정보}</li>
              <li>{EXCEL_SHEET_NAMES.선택안상세}</li>
            </ul>
            <p className="mt-2 text-xs">
              선택 워크시트: {EXCEL_SHEET_NAMES.대상지분석}, {EXCEL_SHEET_NAMES.법규검토}, {EXCEL_SHEET_NAMES.배치안비교}, {EXCEL_SHEET_NAMES.사업성검토}, {EXCEL_SHEET_NAMES.리스크}, {EXCEL_SHEET_NAMES.결론및제안}, {EXCEL_SHEET_NAMES.고정설정}
            </p>
          </div>

          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload button */}
          <Button
            onClick={handleButtonClick}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                파일 처리 중...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                가져오기 완료
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                파일 선택
              </>
            )}
          </Button>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Missing sheets warning */}
          {missingSheets.length > 0 && !error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                다음 워크시트가 누락되어 기본값이 적용됩니다: {missingSheets.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                데이터를 성공적으로 가져왔습니다. 보고서 화면으로 이동합니다.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
