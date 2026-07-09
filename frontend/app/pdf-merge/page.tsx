'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize } from '@/lib/api'

interface Entry {
  id: number
  file: File
  pages: number | null
}

// Best-effort client-side page count (works for most uncompressed xrefs)
async function countPdfPages(file: File): Promise<number | null> {
  try {
    const text = await file.slice(0, 4 * 1024 * 1024).text()
    const matches = text.match(/\/Type\s*\/Page[\s>/\]]/g)
    return matches && matches.length > 0 ? matches.length : null
  } catch {
    return null
  }
}

let nextId = 1

export default function MergePdfs() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ file_id: string; total_pages: number; file_size_kb: number } | null>(null)

  const onFiles = async (files: File[]) => {
    const newEntries: Entry[] = files.map((file) => ({ id: nextId++, file, pages: null }))
    setEntries((prev) => [...prev, ...newEntries])
    setResult(null)
    setError('')
    for (const entry of newEntries) {
      const pages = await countPdfPages(entry.file)
      if (pages) {
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, pages } : e)))
      }
    }
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

  const merge = async () => {
    if (entries.length < 2) {
      setError('Need at least 2 PDF files to merge')
      return
    }
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      entries.forEach((e) => formData.append('files', e.file))
      const data = await uploadFile('pdf/merge', formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Merge failed')
    } finally {
      setBusy(false)
    }
  }

  const totalPages = entries.reduce((a, e) => a + (e.pages || 0), 0)
  const totalSize = entries.reduce((a, e) => a + e.file.size, 0)

  return (
    <ToolPage
      crumb="Merge PDFs"
      emoji="🔗"
      title="Merge PDFs"
      subtitle="Combine multiple PDFs into one document, in order."
    >
      <Dropzone
        emoji="📄"
        label="Drag & drop PDFs here, or click to add another"
        hint="Reorder with the handles below — files merge top to bottom"
        accept="application/pdf"
        multiple
        compact
        onFiles={onFiles}
      />

      {entries.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                padding: '14px 16px',
                boxShadow: '2px 2px 0 var(--border)',
              }}
            >
              <span style={{ fontSize: 15, color: 'var(--faint)', cursor: 'grab' }}>⠿</span>
              <div
                style={{
                  width: 34,
                  height: 42,
                  background: 'white',
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                📄
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.file.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {entry.pages ? `${entry.pages} pages · ` : ''}
                  {formatFileSize(entry.file.size)}
                </div>
              </div>
              <span className="font-pixel" style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>
                #{i + 1}
              </span>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => move(entry.id, -1)}
                  className="btn-secondary"
                  style={{ width: 28, height: 28, padding: 0, fontSize: 12 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => move(entry.id, 1)}
                  className="btn-secondary"
                  style={{ width: 28, height: 28, padding: 0, fontSize: 12 }}
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(entry.id)}
                  className="btn-secondary"
                  style={{ width: 28, height: 28, padding: 0, fontSize: 12, color: 'oklch(50% 0.15 25)' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div
          className="notch-6"
          style={{
            marginTop: 24,
            background: 'var(--tile)',
            border: '2px solid var(--accent-soft)',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-dark)' }}>
              merged-document.pdf
            </div>
            <div style={{ fontSize: 12, color: 'oklch(45% 0.03 250)', marginTop: 2 }}>
              {entries.length} files{totalPages ? ` · ${totalPages} pages` : ''} · ~
              {formatFileSize(totalSize)}
            </div>
          </div>
          <span style={{ fontSize: 24 }}>➡️</span>
        </div>
      )}

      {error && <ErrorPanel message={error} />}

      {entries.length > 0 && (
        <div style={{ marginTop: 22 }}>
          {result ? (
            <DonePanel
              filename="merged-document.pdf"
              meta={`${result.total_pages} pages · ${formatFileSize(result.file_size_kb * 1024)} · ready`}
              onDownload={() => downloadFile(result.file_id)}
              onReset={() => {
                setEntries([])
                setResult(null)
              }}
              resetLabel="Merge more"
            />
          ) : (
            <button className="btn-primary" onClick={merge} disabled={busy || entries.length < 2}>
              {busy ? 'Merging...' : '🔗 Merge & download'}
            </button>
          )}
        </div>
      )}
    </ToolPage>
  )
}
