'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import VideoPreview from '@/components/ui/VideoPreview'
import ActionRow from '@/components/ui/ActionRow'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile } from '@/lib/api'
import { loadMediaMeta } from '@/lib/media'

const PRESETS = [
  { label: '480p · 854×480', width: 854, height: 480 },
  { label: '720p · 1280×720', width: 1280, height: 720 },
  { label: '1080p · 1920×1080', width: 1920, height: 1080 },
  { label: '4K · 3840×2160', width: 3840, height: 2160 },
]

export default function VideoResize() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ file_id: string; output_resolution: string } | null>(null)

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError('')
    setResult(null)
    try {
      const meta = await loadMediaMeta(f, 'video')
      if (meta.width && meta.height) {
        setWidth(meta.width)
        setHeight(meta.height)
      }
    } catch {
      /* keep defaults */
    }
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl('')
    setWidth(1920)
    setHeight(1080)
    setError('')
    setResult(null)
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
      const data = await uploadFile('video/resize', formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Resize failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      crumb="Video Resize"
      emoji="📐"
      title="Video Resize"
      subtitle="Resize a video to a different resolution."
    >
      {!file ? (
        <Dropzone
          emoji="🎬"
          label="Drag & drop a video, or click to browse"
          hint="MP4, MOV, WEBM up to 2 GB"
          accept="video/*"
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
            <VideoPreview
              src={previewUrl}
              leftBadge={`${width}×${height}`}
              accent
              maxHeight={320}
              style={{ aspectRatio: `${width || 1}/${height || 1}` }}
            />

            <div className="pixel-card notch-6" style={{ padding: 20, boxShadow: 'none' }}>
              <div className="label-caps" style={{ marginBottom: 10 }}>
                Custom size
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="pixel-input"
                  value={width || ''}
                  onChange={(e) => {
                    setWidth(Number(e.target.value) || 0)
                    setResult(null)
                  }}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
                />
                <span style={{ color: 'var(--faint)' }}>×</span>
                <input
                  type="number"
                  className="pixel-input"
                  value={height || ''}
                  onChange={(e) => {
                    setHeight(Number(e.target.value) || 0)
                    setResult(null)
                  }}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
                />
              </div>

              <div className="label-caps" style={{ marginTop: 20, marginBottom: 8 }}>
                Presets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRESETS.map((p) => {
                  const active = p.width === width && p.height === height
                  return (
                    <button
                      key={p.label}
                      className={`chip${active ? ' selected' : ''}`}
                      onClick={() => {
                        setWidth(p.width)
                        setHeight(p.height)
                        setResult(null)
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

          {result ? (
            <div style={{ marginTop: 22 }}>
              <DonePanel
                filename={file.name}
                meta={`${result.output_resolution} · ready`}
                onDownload={() => downloadFile(result.file_id)}
                onReset={reset}
              />
            </div>
          ) : (
            <ActionRow
              primaryLabel="⬇ Download resized video"
              busyLabel="Resizing..."
              busy={busy}
              disabled={!width || !height}
              onPrimary={resize}
              secondaryLabel="Start over"
              onSecondary={reset}
            />
          )}
        </>
      )}
    </ToolPage>
  )
}
