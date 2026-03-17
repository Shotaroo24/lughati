import { useState, useCallback, useMemo, useRef } from 'react'
import Papa from 'papaparse'
import type { CardInput } from '../../hooks/useCards'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

// ── Column role types ──────────────────────────────────────────────────────

type ColumnRole = 'arabic' | 'english' | 'romanization' | 'skip'

const ROLE_LABELS: Record<ColumnRole, string> = {
  arabic: 'アラビア語',
  english: '英語',
  romanization: 'ローマ字',
  skip: 'スキップ',
}

// ── Column auto-detection ──────────────────────────────────────────────────

const ARABIC_RE = /[\u0600-\u06FF]/

function detectRole(header: string, samples: string[]): ColumnRole {
  const h = header.toLowerCase().trim()
  if (['arabic', 'ar', 'عربي', 'arab', 'word'].includes(h)) return 'arabic'
  if (['english', 'en', 'translation', 'meaning', 'definition'].includes(h)) return 'english'
  if (['romanization', 'roman', 'transliteration', 'romanized', 'pronunciation'].includes(h))
    return 'romanization'
  const arabicRatio = samples.filter(v => ARABIC_RE.test(v)).length / (samples.length || 1)
  if (arabicRatio > 0.4) return 'arabic'
  return 'skip'
}

function autoAssign(headers: string[], rows: string[][]): ColumnRole[] {
  const roles: ColumnRole[] = new Array(headers.length).fill('skip')
  let arabicDone = false, englishDone = false, romDone = false

  headers.forEach((h, i) => {
    const samples = rows.slice(0, 10).map(r => r[i] ?? '')
    const role = detectRole(h, samples)
    if (role === 'arabic' && !arabicDone) { roles[i] = 'arabic'; arabicDone = true }
    else if (role === 'english' && !englishDone) { roles[i] = 'english'; englishDone = true }
    else if (role === 'romanization' && !romDone) { roles[i] = 'romanization'; romDone = true }
  })

  // Positional fallback if nothing auto-detected
  if (!arabicDone && headers.length > 0) { roles[0] = 'arabic'; arabicDone = true }
  if (!englishDone && headers.length > 1) { roles[1] = 'english'; englishDone = true }
  if (!romDone && headers.length > 2) roles[2] = 'romanization'

  return roles
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedData {
  headers: string[]
  rows: string[][]
}

interface BulkImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (cards: CardInput[]) => Promise<{ error: string | null; count: number }>
}

// ── Component ─────────────────────────────────────────────────────────────

export function BulkImportModal({ open, onClose, onImport }: BulkImportModalProps) {
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count: number; error: string | null } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setParsed(null)
    setColumnRoles([])
    setText('')
    setResult(null)
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  // ── Parsing ────────────────────────────────────────────────────────────

  const parseContent = useCallback((content: string) => {
    const res = Papa.parse<string[]>(content, {
      skipEmptyLines: 'greedy' as const,
      transform: (v: string) => v.trim(),
    })

    if (res.data.length === 0) {
      setResult({ count: 0, error: 'データが見つかりません。ファイルを確認してください。' })
      return
    }

    const allRows = res.data as string[][]
    const firstRow = allRows[0]

    // Header detection: first row has no Arabic text and all cells are short label-like strings
    const looksLikeHeader =
      !ARABIC_RE.test(firstRow.join('')) &&
      firstRow.every(v => v.length > 0 && v.length < 40 && !/^\d+$/.test(v))

    const headers = looksLikeHeader ? firstRow : firstRow.map((_, i) => `列 ${i + 1}`)
    const dataRows = looksLikeHeader ? allRows.slice(1) : allRows

    if (dataRows.length === 0) {
      setResult({ count: 0, error: 'ヘッダー行のみでデータがありません。' })
      return
    }

    const parsedData: ParsedData = { headers, rows: dataRows }
    setParsed(parsedData)
    setColumnRoles(autoAssign(headers, dataRows))
    setResult(null)
  }, [])

  // ── File handling ──────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => parseContent(e.target?.result as string)
    reader.readAsText(file, 'UTF-8')
  }, [parseContent])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Preview cards ──────────────────────────────────────────────────────

  const previewCards = useMemo((): CardInput[] => {
    if (!parsed) return []
    const ai = columnRoles.indexOf('arabic')
    const ei = columnRoles.indexOf('english')
    const ri = columnRoles.indexOf('romanization')
    if (ai === -1 || ei === -1) return []
    return parsed.rows
      .map(row => ({
        arabic: row[ai]?.trim() ?? '',
        english: row[ei]?.trim() ?? '',
        romanization: ri !== -1 ? (row[ri]?.trim() || undefined) : undefined,
      }))
      .filter(c => c.arabic && c.english)
  }, [parsed, columnRoles])

  const skippedCount = parsed ? parsed.rows.length - previewCards.length : 0

  // ── Import ─────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (previewCards.length === 0) return
    setLoading(true)
    const res = await onImport(previewCards)
    setLoading(false)
    setResult(res)
    if (!res.error) {
      setTimeout(() => { reset(); onClose() }, 1200)
    }
  }

  // ── Column role change ─────────────────────────────────────────────────

  const changeRole = (colIdx: number, role: ColumnRole) => {
    setColumnRoles(prev => {
      const next = [...prev]
      // Unique roles: remove from other columns first
      if (role !== 'skip') {
        for (let i = 0; i < next.length; i++) {
          if (i !== colIdx && next[i] === role) next[i] = 'skip'
        }
      }
      next[colIdx] = role
      return next
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={handleClose} title="CSVインポート">
      <div className="flex flex-col gap-4">

        {/* Mode tabs */}
        <div className="flex rounded-xl p-1" style={{ backgroundColor: 'var(--color-primary-light)' }}>
          {(['file', 'text'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); reset() }}
              className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === m ? 'var(--color-primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--color-primary)',
              }}
            >
              {m === 'file' ? 'ファイル' : 'テキスト貼付け'}
            </button>
          ))}
        </div>

        {/* ── File upload mode ── */}
        {mode === 'file' && !parsed && (
          <>
            <div
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 px-4 cursor-pointer transition-colors"
              style={{
                borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: isDragging ? 'var(--color-primary-light)' : 'transparent',
              }}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                style={{ color: 'var(--color-text-secondary)', marginBottom: 12 }}
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                クリックまたはドラッグ&amp;ドロップ
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                CSV / TSV / TXT ファイル（UTF-8）
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
              列の順序: アラビア語, 英語, ローマ字（任意）
            </p>
          </>
        )}

        {/* ── Text paste mode ── */}
        {mode === 'text' && !parsed && (
          <div className="flex flex-col gap-3">
            <textarea
              rows={7}
              placeholder={'arabic,english,romanization\nمرحبا,Hello,marhaba\nشكرا,Thank you,shukran'}
              value={text}
              onChange={e => { setText(e.target.value); setResult(null) }}
              className="rounded-xl px-4 py-3 text-sm w-full border outline-none transition-colors resize-none font-mono"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={!text.trim()}
              onClick={() => parseContent(text)}
            >
              解析する
            </Button>
          </div>
        )}

        {/* ── Column mapping + preview ── */}
        {parsed && (
          <>
            {/* Column role dropdowns */}
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                列の割り当て
              </p>
              <div className="flex gap-2">
                {parsed.headers.map((header, i) => (
                  <div key={i} className="flex flex-col gap-1 flex-1 min-w-0">
                    <span
                      className="text-xs truncate px-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {header}
                    </span>
                    <select
                      value={columnRoles[i] ?? 'skip'}
                      onChange={e => changeRole(i, e.target.value as ColumnRole)}
                      className="rounded-lg px-2 py-1.5 text-xs border outline-none w-full"
                      style={{
                        borderColor: columnRoles[i] !== 'skip'
                          ? 'var(--color-primary)'
                          : 'var(--color-border)',
                        backgroundColor: 'var(--color-bg-card)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {Object.entries(ROLE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* 5-row preview table */}
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                プレビュー（最初の5行）
              </p>
              <div
                className="overflow-x-auto rounded-xl border"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary-light)' }}>
                      {parsed.headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left font-medium"
                          style={{
                            color: columnRoles[i] !== 'skip'
                              ? 'var(--color-primary)'
                              : 'var(--color-text-secondary)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} style={{ borderTop: '1px solid var(--color-border)' }}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 max-w-[100px] truncate"
                            style={{
                              color: columnRoles[ci] !== 'skip'
                                ? 'var(--color-text-primary)'
                                : 'var(--color-text-secondary)',
                              opacity: columnRoles[ci] === 'skip' ? 0.5 : 1,
                              direction: columnRoles[ci] === 'arabic' ? 'rtl' : 'ltr',
                              fontFamily: columnRoles[ci] === 'arabic'
                                ? 'var(--font-arabic)' : undefined,
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary banner */}
            {previewCards.length > 0 ? (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
              >
                <span className="font-medium">{previewCards.length} 件をインポートします</span>
                {skippedCount > 0 && (
                  <span className="opacity-70"> （{skippedCount} 件スキップ）</span>
                )}
              </div>
            ) : (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
              >
                インポート対象がありません。アラビア語と英語の列を割り当ててください。
              </div>
            )}
          </>
        )}

        {/* Result messages */}
        {result?.error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
          >
            {result.error}
          </div>
        )}
        {result && !result.error && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: '#E6F7F0', color: 'var(--color-success)' }}
          >
            {result.count} 件のカードをインポートしました ✓
          </div>
        )}

        {/* Action buttons */}
        {parsed ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!px-4 !py-2 !text-sm shrink-0"
              onClick={reset}
              disabled={loading}
            >
              やり直し
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!px-4 !py-2 !text-sm shrink-0"
              onClick={handleClose}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              fullWidth
              className="!py-2 !text-sm"
              loading={loading}
              disabled={previewCards.length === 0}
              onClick={handleImport}
            >
              インポート
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="!py-2 !text-sm"
            onClick={handleClose}
            disabled={loading}
          >
            キャンセル
          </Button>
        )}
      </div>
    </Modal>
  )
}
