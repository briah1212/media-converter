'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import VideoPreview from '@/components/ui/VideoPreview'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize, formatDuration } from '@/lib/api'
import { loadMediaMeta, MediaMeta } from '@/lib/media'

const RESOLUTIONS = [
  { label: '480p', height: 480, factor: 0.25 },
  { label: '720p', height: 720, factor: 0.45 },
  { label: '1080p', height: 1080, factor: 0.7 },
  { label: '4K', height: 2160, factor: 1 },
]

function presetForQuality(q: number): string {
  if (q >= 81) return 'high'
  if (q >= 56) return 'balanced'
  if (q >= 31) return 'high_compression'
  return 'max_compression'
}

export default function VideoCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [meta, setMeta] = useState<MediaMeta | null>(null)
  const [quality, setQuality] = useState(60)
  const [resolution, setResolution] = useState('1080p')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ file_id: string; message: string } | null>(null)

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError('')
    setResult(null)
    try {
      const m = await loadMediaMeta(f, 'video')
      setMeta(m)
      if (m.height) {
        const fit = RESOLUTIONS.filter((r) => r.height <= m.height!).pop()
        if (fit) setResolution(fit.label)
      }
    } catch {
      setMeta(null)
    }
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl('')
    setMeta(null)
    setQuality(60)
    setResolution('1080p')
    setError('')
    setResult(null)
  }

  const selectedRes = RESOLUTIONS.find((r) => r.label === resolution) || RESOLUTIONS[2]
  const qFactor = 0.15 + (quality / 100) * 0.55
  const estBytes = file ? Math.max(1, file.size * selectedRes.factor * qFactor) : 0
  const savedPct = file ? Math.round((1 - estBytes / file.size) * 100) : 0

  const compress = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const params = new URLSearchParams({
        preset: presetForQuality(quality),
        max_height: String(selectedRes.height),
      })
      const data = await uploadFile(`compress/video?${params}`, formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Compression failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      crumb="Video Compress"
      emoji="📦"
      title="Video Compress"
      subtitle="Shrink a video's file size while keeping it watchable."
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
          <VideoPreview
            src={previewUrl}
            leftBadge={`${file.name}${meta?.width ? ` · ${meta.width}×${meta.height}` : ''}`}
            rightBadge={meta?.duration ? formatDuration(meta.duration) : undefined}
            style={{ marginTop: 24 }}
          />
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
            Original size: {formatFileSize(file.size)}
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 20, padding: 22, boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">Compression level</span>
              <span className="label-caps">{quality}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => {
                setQuality(Number(e.target.value))
                setResult(null)
              }}
              style={{ width: '100%', marginTop: 12 }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--faint)',
                marginTop: 2,
              }}
            >
              <span>Smallest file</span>
              <span>Best quality</span>
            </div>

            <div className="label-caps" style={{ marginTop: 18 }}>
              Resolution
            </div>
            <Chips
              options={RESOLUTIONS.map((r) => ({ value: r.label, label: r.label }))}
              value={resolution}
              onChange={(r) => {
                setResolution(r)
                setResult(null)
              }}
            />
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
              Estimated result
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-dark)' }}>
              ≈ {formatFileSize(estBytes)} <span style={{ fontWeight: 400 }}>· {savedPct}% smaller</span>
            </div>
          </div>

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            {result ? (
              <DonePanel
                filename={file.name.replace(/\.[^.]+$/, '-compressed.mp4')}
                meta={result.message}
                onDownload={() => downloadFile(result.file_id)}
                onReset={reset}
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
