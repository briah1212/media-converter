'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import PreviewPane from '@/components/ui/PreviewPane'
import ActionRow from '@/components/ui/ActionRow'
import { ErrorPanel } from '@/components/ui/panels'
import { getApiUrl, uploadFile, downloadFile, formatFileSize } from '@/lib/api'

interface Result {
  file_id: string
  output_size_kb: number
  dimensions: string
}

export default function HeicToJpg() {
  const [file, setFile] = useState<File | null>(null)
  const [keepMetadata, setKeepMetadata] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const onFiles = (files: File[]) => {
    setFile(files[0])
    setResult(null)
    setError('')
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError('')
    setKeepMetadata(true)
  }

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('keep_metadata', String(keepMetadata))
      const data = await uploadFile('convert/heic-to-jpg', formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, '') : ''

  return (
    <ToolPage
      crumb="HEIC to JPG"
      emoji="📸"
      title="HEIC to JPG"
      subtitle="Convert iPhone HEIC photos to universal JPG."
    >
      {!file ? (
        <Dropzone
          emoji="📱"
          label="Drag & drop HEIC photos, or click to browse"
          hint="HEIC, HEIF up to 25 MB each"
          accept=".heic,.heif"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div
            style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          >
            <PreviewPane
              label="Original · HEIC"
              caption={file.name}
              meta={<span style={{ color: 'var(--muted)' }}>{formatFileSize(file.size)}</span>}
            />
            <PreviewPane
              label="Converted · JPG"
              accent
              imageUrl={result ? `${getApiUrl()}/api/v1/download/${result.file_id}` : null}
              caption={`${baseName}.jpg`}
              meta={
                result ? (
                  <span style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>
                    {formatFileSize(result.output_size_kb * 1024)}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>Converted photo appears here</span>
                )
              }
            />
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 28, padding: 22, boxShadow: 'none' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={keepMetadata}
                onChange={(e) => {
                  setKeepMetadata(e.target.checked)
                  setResult(null)
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
              />
              Keep photo metadata (location, date taken)
            </label>
          </div>

          {error && <ErrorPanel message={error} />}

          <ActionRow
            primaryLabel="⬇ Download JPG"
            busyLabel="Converting..."
            busy={busy}
            onPrimary={convert}
            secondaryLabel="Start over"
            onSecondary={reset}
          />
        </>
      )}
    </ToolPage>
  )
}
