'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize } from '@/lib/api'

interface Entry {
  id: number
  file: File
  previewUrl: string
}

const PAGE_SIZES = [
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' },
  { label: 'Fit to image', value: 'fit' },
]

let nextId = 1

export default function ImagesToPdf() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [pageSize, setPageSize] = useState('A4')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ file_id: string; page_count: number; file_size_kb: number } | null>(null)

  const onFiles = (files: File[]) => {
    setEntries((prev) => [
      ...prev,
      ...files.map((file) => ({ id: nextId++, file, previewUrl: URL.createObjectURL(file) })),
    ])
    setResult(null)
    setError('')
  }

  const move = (id: number, dir: -1 | 1) => {
    setEntries((prev) => {
      const i = prev.findIndex((e) => e.id === id)
      const j = i + dir
      if (i === -1 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setResult(null)
  }

  const remove = (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setResult(null)
  }

  const combine = async () => {
    if (entries.length === 0) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      entries.forEach((e) => formData.append('files', e.file))
      formData.append('page_size', PAGE_SIZES.find((p) => p.label === pageSize)?.value || 'fit')
      const data = await uploadFile('pdf/from-images', formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'PDF creation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      crumb="Images to PDF"
      emoji="📸"
      title="Images to PDF"
      subtitle="Combine images into a single PDF document, in order."
    >
      <Dropzone
        emoji="🖼️"
        label="Drag & drop images here, or click to add another"
        hint="Reorder with the arrows below — pages follow this order"
        accept="image/*"
        multiple
        compact
        onFiles={onFiles}
      />

      {entries.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 12,
          }}
        >
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              style={{ background: 'var(--surface)', border: '2px solid var(--border)', padding: 10 }}
            >
              <div
                className="stripes-fine"
                style={{
                  aspectRatio: '3/4',
                  border: '1px solid var(--border)',
                  position: 'relative',
                  overflow: 'hidden',
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
                <span
                  className="font-pixel"
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    fontSize: 11,
                    color: 'var(--accent-dark)',
                    background: 'white',
                    padding: '2px 6px',
                    border: '1px solid var(--border)',
                  }}
                >
                  {i + 1}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  marginTop: 6,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {entry.file.name}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button
                  onClick={() => move(entry.id, -1)}
                  className="btn-secondary"
                  style={{ flex: 1, height: 24, padding: 0, fontSize: 11 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => move(entry.id, 1)}
                  className="btn-secondary"
                  style={{ flex: 1, height: 24, padding: 0, fontSize: 11 }}
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(entry.id)}
                  className="btn-secondary"
                  style={{ flex: 1, height: 24, padding: 0, fontSize: 11, color: 'oklch(50% 0.15 25)' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pixel-card notch-6" style={{ marginTop: 24, padding: 20, boxShadow: 'none' }}>
        <div className="label-caps">Page size</div>
        <Chips
          options={PAGE_SIZES.map((p) => ({ value: p.label, label: p.label }))}
          value={pageSize}
          onChange={(p) => {
            setPageSize(p)
            setResult(null)
          }}
          style={{ marginTop: 10 }}
        />
      </div>

      {entries.length > 0 && (
        <div
          style={{
            marginTop: 24,
            background: 'var(--tile)',
            border: '2px solid var(--accent-soft)',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-dark)' }}>
            combined-document.pdf · {entries.length} pages
          </div>
        </div>
      )}

      {error && <ErrorPanel message={error} />}

      {entries.length > 0 && (
        <div style={{ marginTop: 22 }}>
          {result ? (
            <DonePanel
              filename="combined-document.pdf"
              meta={`${result.page_count || entries.length} pages · ${formatFileSize(result.file_size_kb * 1024)} · ready`}
              onDownload={() => downloadFile(result.file_id)}
              onReset={() => {
                setEntries([])
                setResult(null)
              }}
              resetLabel="Create another"
            />
          ) : (
            <button className="btn-primary" onClick={combine} disabled={busy}>
              {busy ? 'Creating PDF...' : '📸 Create PDF & download'}
            </button>
          )}
        </div>
      )}
    </ToolPage>
  )
}
