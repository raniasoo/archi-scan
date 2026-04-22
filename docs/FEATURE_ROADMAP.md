# Feature Roadmap - Feasibility Report System

> **Baseline Version:** v1.0 (Production Frozen)
> **Last Updated:** 2026-04-08
> **Rule:** All new features must be separate modules. Do not modify frozen report structure, PDF layout, wording, or Excel schema.

---

## Priority 1: Project Save/Load

**Goal:** Allow users to save report projects and reload them later.

### Features
- [ ] Save current report state to database (Supabase)
- [ ] Generate unique project ID per report
- [ ] Load saved projects from dashboard
- [ ] Auto-save draft functionality
- [ ] Export/import project as JSON file (offline backup)

### Technical Approach
```
New files:
- lib/project-storage.ts        # Save/load logic
- components/project-manager.tsx # UI for project list
- app/api/projects/route.ts     # API endpoints

Database tables:
- projects (id, user_id, name, created_at, updated_at)
- project_data (project_id, report_data_json)
```

### Integration Points
- Add "저장" button to report header (separate from PDF/Excel buttons)
- Add "내 프로젝트" section to main page
- No changes to ReportSummary component internals

---

## Priority 2: Branding Automation

**Goal:** Allow users to customize report branding (logo, company name, colors) without changing template structure.

### Features
- [ ] Upload company logo for PDF cover
- [ ] Set company name to replace "Archi-Scan"
- [ ] Choose accent color for PDF headers
- [ ] Save branding settings per user/organization
- [ ] Preview branding before PDF export

### Technical Approach
```
New files:
- lib/branding-config.ts         # Branding types and defaults
- components/branding-editor.tsx # UI for branding settings
- hooks/use-branding.ts          # React hook for branding state

Storage:
- Vercel Blob for logo uploads
- Supabase for branding settings
```

### Integration Points
- Pass branding config as prop to PDF generation (do not modify PDF structure)
- Add "브랜딩 설정" in settings menu
- Default to frozen baseline branding if not configured

---

## Priority 3: Stronger Excel Validation

**Goal:** Provide clear, actionable feedback when uploaded Excel files have errors or missing data.

### Features
- [ ] Cell-level validation with row/column references
- [ ] Required vs optional field indicators
- [ ] Data type validation (number, text, date)
- [ ] Range validation (e.g., coverage 0-100%)
- [ ] Downloadable Excel template with data validation rules
- [ ] Validation summary report before import

### Technical Approach
```
New files:
- lib/excel-validator.ts          # Validation rules engine
- lib/excel-template-generator.ts # Generate template with rules
- components/validation-report.tsx # UI for validation results

Validation rules format:
{
  sheet: '기본정보',
  field: '대지면적(㎡)',
  type: 'number',
  required: true,
  min: 100,
  max: 100000,
  errorMessage: '대지면적은 100~100,000㎡ 범위여야 합니다.'
}
```

### Integration Points
- Enhance ExcelImport component with validation step
- Do not modify report-excel-utils.ts parsing logic
- Add validation before conversion to ReportSummaryInput

---

## Priority 4: Financial Scenario Comparison

**Goal:** Allow users to compare multiple financial scenarios (optimistic, base, conservative) side by side.

### Features
- [ ] Define scenario parameters (land cost variance, construction cost variance, sale price variance)
- [ ] Auto-calculate 3 scenarios from base case
- [ ] Side-by-side comparison table
- [ ] Sensitivity analysis chart
- [ ] Export scenarios to separate PDF appendix

### Technical Approach
```
New files:
- lib/scenario-calculator.ts       # Scenario calculation logic
- components/scenario-editor.tsx   # UI for scenario parameters
- components/scenario-comparison.tsx # Comparison table/chart
- lib/scenario-pdf-appendix.ts     # PDF appendix generation

Scenario model:
{
  name: '낙관적',
  landCostVariance: -5,      // -5% from base
  constructionCostVariance: -3,
  salePriceVariance: +5,
  calculatedROI: 28.5
}
```

### Integration Points
- Add "시나리오 분석" tab after main report (separate section)
- Do not modify main report financials calculation
- Scenarios stored separately from base report data

---

## Priority 5: Map/Photo Insertion

**Goal:** Allow users to add site photos and location maps to the report.

### Features
- [ ] Upload site photos (max 5)
- [ ] Auto-fetch map from address (Kakao/Naver Maps API)
- [ ] Drag-and-drop photo ordering
- [ ] Photo captions
- [ ] Include photos in PDF appendix (not in main report body)

### Technical Approach
```
New files:
- lib/map-service.ts            # Map API integration
- lib/photo-storage.ts          # Photo upload to Vercel Blob
- components/photo-uploader.tsx # UI for photo management
- components/map-preview.tsx    # Map display component
- lib/photo-pdf-appendix.ts     # PDF appendix for photos

External APIs:
- Kakao Maps Static API (or Naver)
- Vercel Blob for photo storage
```

### Integration Points
- Add "사진/지도" section in report flow (after address input)
- Photos/maps go to PDF appendix only (do not modify main PDF pages)
- Store photo references in project data

---

## Priority 6: Version History and Report Management

**Goal:** Track report versions and allow users to compare or restore previous versions.

### Features
- [ ] Auto-version on each save
- [ ] Version list with timestamps
- [ ] View previous version (read-only)
- [ ] Compare two versions side by side
- [ ] Restore previous version
- [ ] Add version notes/comments
- [ ] Bulk delete old versions

### Technical Approach
```
New files:
- lib/version-manager.ts         # Version CRUD operations
- components/version-history.tsx # UI for version list
- components/version-diff.tsx    # Side-by-side comparison

Database tables:
- project_versions (id, project_id, version_number, data_json, notes, created_at)

Version storage strategy:
- Store full snapshot per version (simple, reliable)
- Optional: Store diffs for large projects (future optimization)
```

### Integration Points
- Add "버전 기록" panel accessible from project manager
- Version comparison as modal overlay
- Do not modify report rendering logic

---

## Implementation Rules

1. **Separate Modules Only**
   - Each feature gets its own files in `lib/`, `components/`, `hooks/`
   - Do not modify frozen baseline files

2. **Frozen Files (Do Not Edit)**
   - `components/report-summary.tsx`
   - `lib/report-data-schema.ts`
   - `lib/report-excel-utils.ts`
   - `components/excel-import.tsx`

3. **Integration via Props/Callbacks**
   - Pass new data to frozen components via existing props
   - Add new UI outside frozen component boundaries

4. **Database Schema**
   - All new tables prefixed with feature name
   - Foreign key to main `projects` table

5. **Testing**
   - Each feature must not break existing PDF/Excel export
   - Verify baseline report renders identically after feature addition

---

## Timeline Estimate

| Priority | Feature | Estimated Effort |
|----------|---------|------------------|
| P1 | Project Save/Load | 1-2 weeks |
| P2 | Branding Automation | 1 week |
| P3 | Excel Validation | 1 week |
| P4 | Scenario Comparison | 2 weeks |
| P5 | Map/Photo Insertion | 2 weeks |
| P6 | Version History | 2 weeks |

**Total:** 9-12 weeks for full roadmap

---

## Notes

- All features are optional enhancements
- Baseline report system works independently
- Features can be implemented in any order based on user demand
- Each feature should have its own feature flag for gradual rollout
