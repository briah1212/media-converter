'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import ActionRow from '@/components/ui/ActionRow'
import { ErrorPanel } from '@/components/ui/panels'
import { uploadFile, formatFileSize } from '@/lib/api'

interface DetectResult {
  detected_format: string
  width: number
  height: number
  size_kb: number
  mode: string
  has_transparency: boolean
}

export default function ImageDetect() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DetectResult | null>(null)

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setResult(null)
    setError('')
    setBusy(true)
    try {
      const formData = new FormData()
      formData.append('file', f)
      const data = await uploadFile('compress/image/detect', formData)
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Detection failed')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl('')
    setResult(null)
    setError('')
  }

  const exportJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'image'}-detection.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const rows = result
    ? [
        { label: 'Format', value: result.detected_format?.toUpperCase() || 'N/A' },
        { label: 'Dimensions', value: `${result.width} × ${result.height} px` },
        { label: 'File size', value: formatFileSize(result.size_kb * 1024) },
        { label: 'Color mode', value: result.mode },
        { label: 'Transparency', value: result.has_transparency ? 'Yes' : 'No' },
      ]
    : []

  return (
    <ToolPage
      crumb="Image Detect"
      emoji="🔍"
      title="Image Detect"
      subtitle="Detect objects and content in an image."
    >
      {!file ? (
        <Dropzone
          emoji="🖼️"
          label="Drag & drop an image, or click to browse"
          hint="JPG, PNG, WEBP up to 25 MB"
          accept="image/*,.heic,.heif"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div
            style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
          >
            <div
              className="stripes"
              style={{
                aspectRatio: '4/3',
                border: '2px solid var(--border)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={file.name}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div>
              <div className="label-caps" style={{ marginBottom: 12 }}>
                {busy ? 'Detecting...' : `Detected (${rows.length})`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((r) => (
                  <div
                    key={r.label}
                    style={{
                      background: 'var(--surface)',
                      border: '2px solid var(--border)',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <span>{r.label}</span>
                    <span style={{ color: 'var(--accent-dark)' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && <ErrorPanel message={error} />}

          <ActionRow
            primaryLabel="⬇ Export detections (JSON)"
            busy={busy}
            disabled={!result}
            onPrimary={exportJson}
            secondaryLabel="Try another image"
            onSecondary={reset}
          />
        </>
      )}
    </ToolPage>
  )
}
