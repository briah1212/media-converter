'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import { ErrorPanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize } from '@/lib/api'

interface Entry {
  file: File
  previewUrl: string
}

interface FileResult {
  name: string
  success: boolean
  output_size_kb?: number
}

export default function BatchCompress() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [quality, setQuality] = useState(75)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<FileResult[] | null>(null)

  const onFiles = (files: File[]) => {
    setEntries((prev) => [
      ...prev,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ])
    setResults(null)
    setError('')
  }

  const compressAll = async () => {
    if (entries.length === 0) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      entries.forEach((e) => formData.append('files', e.file))
      formData.append('quality', String(quality))
      const data = await uploadFile('batch/compress', formData)
      setResults(data.results)
      if (data.zip_file_id) downloadFile(data.zip_file_id)
    } catch (err: any) {
      setError(err.message || 'Batch compression failed')
    } finally {
      setBusy(false)
    }
  }

  const resultFor = (name: string) => results?.find((r) => r.name === name && r.success)

  const totalOriginal = entries.reduce((a, e) => a + e.file.size, 0)
  const totalCompressed = results
    ? results.filter((r) => r.success).reduce((a, r) => a + (r.output_size_kb || 0) * 1024, 0)
    : null
  const totalPct =
    totalCompressed !== null && totalOriginal > 0
      ? Math.round((1 - totalCompressed / totalOriginal) * 100)
      : null

  return (
    <ToolPage
      crumb="Batch Compress"
      emoji="📦"
      title="Batch Compress"
      subtitle="Compress many images at once with one shared setting."
    >
      <Dropzone
        emoji="🖼️"
        label="Drag & drop images here, or click to add more"
        hint="JPG, PNG, WEBP · unlimited files"
        accept="image/jpeg,image/png,image/webp"
        multiple
        compact
        onFiles={onFiles}
      />

      <div className="pixel-card notch-6" style={{ marginTop: 22, padding: 20, boxShadow: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="label-caps">Quality (applied to all)</span>
          <span className="label-caps">{quality}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={quality}
          onChange={(e) => {
            setQuality(Number(e.target.value))
            setResults(null)
          }}
          style={{ width: '100%', marginTop: 12 }}
        />
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, i) => {
            const r = resultFor(entry.file.name)
            const pct =
              r && r.output_size_kb
                ? Math.max(0, Math.round((1 - (r.output_size_kb * 1024) / entry.file.size) * 100))
                : null
            return (
              <div
                key={`${entry.file.name}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  padding: '12px 16px',
                }}
              >
                <div
                  className="stripes-fine"
                  style={{
                    width: 36,
                    height: 36,
                    border: '2px solid var(--border)',
                    flexShrink: 0,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.previewUrl}
                    alt={entry.file.name}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.file.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {formatFileSize(entry.file.size)}{' '}
                    {r && r.output_size_kb && (
                      <span style={{ color: 'var(--accent-dark)' }}>
                        → {formatFileSize(r.output_size_kb * 1024)}
                      </span>
                    )}
                  </div>
                </div>
                {pct !== null && (
                  <span
                    className="font-pixel"
                    style={{
                      fontSize: 10,
                      color: 'var(--accent-dark)',
                      background: 'var(--tile)',
                      padding: '4px 8px',
                      flexShrink: 0,
                    }}
                  >
                    -{pct}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {entries.length > 0 && (
        <div
          style={{
            marginTop: 24,
            background: 'var(--tile)',
            border: '2px solid var(--accent-soft)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-dark)' }}>
            {entries.length} files · {formatFileSize(totalOriginal)}
            {totalCompressed !== null && <> → {formatFileSize(totalCompressed)}</>}
          </div>
          {totalPct !== null && (
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-dark)' }}>
              {totalPct}% smaller
            </div>
          )}
        </div>
      )}

      {error && <ErrorPanel message={error} />}

      {entries.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <button className="btn-primary" onClick={compressAll} disabled={busy}>
            {busy ? 'Compressing...' : '📦 Compress all & download .zip'}
          </button>
        </div>
      )}
    </ToolPage>
  )
}
