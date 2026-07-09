'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import ActionRow from '@/components/ui/ActionRow'
import { ErrorPanel } from '@/components/ui/panels'
import { uploadFile, downloadFile } from '@/lib/api'

export default function ImageResize() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lockRatio, setLockRatio] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ratio = natural ? natural.w / natural.h : 1

  const presets = natural
    ? [
        { key: 'small', label: `Small · 640×${Math.round(640 / ratio)}`, width: 640, height: Math.round(640 / ratio) },
        { key: 'medium', label: `Medium · 1280×${Math.round(1280 / ratio)}`, width: 1280, height: Math.round(1280 / ratio) },
        { key: 'large', label: `Large · 1920×${Math.round(1920 / ratio)}`, width: 1920, height: Math.round(1920 / ratio) },
        { key: 'square', label: 'Square · 1080×1080', width: 1080, height: 1080 },
      ]
    : []

  const onFiles = (files: File[]) => {
    const f = files[0]
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight })
      setWidth(img.naturalWidth)
      setHeight(img.naturalHeight)
    }
    img.src = url
    setFile(f)
    setPreviewUrl(url)
    setError('')
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl('')
    setNatural(null)
    setWidth(0)
    setHeight(0)
    setLockRatio(true)
    setError('')
  }

  const onWidthChange = (value: number) => {
    setWidth(value)
    if (lockRatio && value > 0) setHeight(Math.round(value / ratio))
  }

  const onHeightChange = (value: number) => {
    setHeight(value)
    if (lockRatio && value > 0) setWidth(Math.round(value * ratio))
  }

  const resize = async () => {
    if (!file || !width || !height) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('width', String(width))
      formData.append('height', String(height))
      const data = await uploadFile('image/resize', formData)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Resize failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      crumb="Image Resize"
      emoji="📐"
      title="Image Resize"
      subtitle="Resize an image to custom dimensions."
    >
      {!file ? (
        <Dropzone
          emoji="🖼️"
          label="Drag & drop an image, or click to browse"
          hint="JPG, PNG, WEBP up to 25 MB"
          accept="image/jpeg,image/png,image/webp"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div
            style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: '1fr 260px',
              gap: 24,
              alignItems: 'start',
            }}
          >
            <div
              className="stripes"
              style={{
                border: '2px solid oklch(58% 0.135 250 / 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: `${width || 1}/${height || 1}`,
                maxHeight: 340,
                position: 'relative',
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
                  objectFit: 'fill',
                }}
              />
              <span
                className="font-mono"
                style={{
                  position: 'relative',
                  fontSize: 11,
                  color: 'var(--muted)',
                  background: 'white',
                  padding: '4px 8px',
                  border: '1px solid var(--border)',
                }}
              >
                {width}×{height}
              </span>
            </div>

            <div className="pixel-card notch-6" style={{ padding: 20, boxShadow: 'none' }}>
              <div className="label-caps" style={{ marginBottom: 10 }}>
                Dimensions
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="pixel-input"
                  value={width || ''}
                  onChange={(e) => onWidthChange(Number(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
                />
                <span style={{ color: 'var(--faint)' }}>×</span>
                <input
                  type="number"
                  className="pixel-input"
                  value={height || ''}
                  onChange={(e) => onHeightChange(Number(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginTop: 12,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={lockRatio}
                  onChange={(e) => setLockRatio(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                Lock aspect ratio
              </label>

              <div className="label-caps" style={{ marginTop: 20, marginBottom: 8 }}>
                Presets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {presets.map((p) => {
                  const active = p.width === width && p.height === height
                  return (
                    <button
                      key={p.key}
                      className={`chip${active ? ' selected' : ''}`}
                      onClick={() => {
                        setWidth(p.width)
                        setHeight(p.height)
                      }}
                      style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12.5 }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {error && <ErrorPanel message={error} />}

          <ActionRow
            primaryLabel="⬇ Download resized image"
            busyLabel="Resizing..."
            busy={busy}
            disabled={!width || !height}
            onPrimary={resize}
            secondaryLabel="Start over"
            onSecondary={reset}
          />
        </>
      )}
    </ToolPage>
  )
}
