'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { getApiUrl, uploadFile, downloadFile, formatFileSize } from '@/lib/api'

// Design labels → backend quality values (backend "high" keeps most quality)
const LEVELS = [
  { label: 'Low', quality: 'high', factor: 0.75, desc: 'Barely visible quality loss — best for archiving.' },
  { label: 'Recommended', quality: 'medium', factor: 0.4, desc: 'Great balance of size and image quality.' },
  { label: 'Extreme', quality: 'low', factor: 0.18, desc: 'Smallest file size, noticeable quality loss on images.' },
]

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [level, setLevel] = useState('Recommended')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ file_id: string; output_size_kb: number; compression_ratio: number } | null>(null)

  const current = LEVELS.find((l) => l.label === level) || LEVELS[1]

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setError('')
    setResult(null)
    setNumPages(0)
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch(`${getApiUrl()}/api/v1/pdf/info`, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setNumPages(data.num_pages || 0)
      }
    } catch {
      /* page count is optional */
    }
  }

  const reset = () => {
    setFile(null)
    setNumPages(0)
    setLevel('Recommended')
    setError('')
    setResult(null)
  }

  const compress = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('quality', current.quality)
      const data = await uploadFile('pdf/compress', formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Compression failed')
    } finally {
      setBusy(false)
    }
  }

  const estBytes = file ? file.size * current.factor : 0
  const savedPct = Math.round((1 - current.factor) * 100)

  return (
    <ToolPage
      crumb="Compress PDF"
      emoji="📦"
      title="Compress PDF"
      subtitle="Reduce a PDF's file size for easy sharing."
    >
      {!file ? (
        <Dropzone
          emoji="📄"
          label="Drag & drop a PDF, or click to browse"
          hint="PDF up to 200 MB"
          accept="application/pdf"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div
            className="pixel-card notch-6"
            style={{
              marginTop: 24,
              padding: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: 'none',
            }}
          >
            <div
              style={{
                width: 36,
                height: 44,
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
                {file.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {numPages ? `${numPages} pages · ` : ''}
                {formatFileSize(file.size)}
              </div>
            </div>
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 20, padding: 22, boxShadow: 'none' }}>
            <div className="label-caps">Compression level</div>
            <Chips
              options={LEVELS.map((l) => ({ value: l.label, label: l.label }))}
              value={level}
              onChange={(l) => {
                setLevel(l)
                setResult(null)
              }}
              style={{ marginTop: 10 }}
            />
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>{current.desc}</div>
          </div>

          <div
            style={{
              marginTop: 20,
              background: 'var(--tile)',
              border: '2px solid var(--accent-soft)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-dark)' }}>
              {result ? 'Result' : 'Estimated result'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-dark)' }}>
              {result ? (
                <>
                  {formatFileSize(result.output_size_kb * 1024)}{' '}
                  <span style={{ fontWeight: 400 }}>· {result.compression_ratio}% smaller</span>
                </>
              ) : (
                <>
                  ≈ {formatFileSize(estBytes)} <span style={{ fontWeight: 400 }}>· {savedPct}% smaller</span>
                </>
              )}
            </div>
          </div>

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22 }}>
            {result ? (
              <DonePanel
                filename={file.name.replace(/\.pdf$/i, '-compressed.pdf')}
                meta={`${formatFileSize(result.output_size_kb * 1024)} · ready`}
                onDownload={() => downloadFile(result.file_id)}
                onReset={reset}
                resetLabel="Compress another"
              />
            ) : (
              <button className="btn-primary" onClick={compress} disabled={busy}>
                {busy ? 'Compressing...' : '📦 Compress & download'}
              </button>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
