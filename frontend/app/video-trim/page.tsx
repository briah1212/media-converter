'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import VideoPreview from '@/components/ui/VideoPreview'
import TrimStats from '@/components/ui/TrimStats'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatDuration } from '@/lib/api'
import { loadMediaMeta, MediaMeta } from '@/lib/media'

const THUMB_COUNT = 12

async function generateFilmstrip(file: File, count: number): Promise<string[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.src = url

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('load failed'))
  })

  const duration = video.duration
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 90
  const ctx = canvas.getContext('2d')
  if (!ctx || !duration) {
    URL.revokeObjectURL(url)
    return []
  }

  const thumbs: string[] = []
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) / count) * duration
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      video.currentTime = t
    })
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    thumbs.push(canvas.toDataURL('image/jpeg', 0.5))
  }
  URL.revokeObjectURL(url)
  return thumbs
}

export default function VideoTrim() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [meta, setMeta] = useState<MediaMeta | null>(null)
  const [thumbs, setThumbs] = useState<string[]>([])
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError('')
    setFileId('')
    setThumbs([])
    try {
      const m = await loadMediaMeta(f, 'video')
      setMeta(m)
      setTrimStart(0)
      setTrimEnd(Math.floor(m.duration))
    } catch {
      setMeta(null)
    }
    try {
      setThumbs(await generateFilmstrip(f, THUMB_COUNT))
    } catch {
      setThumbs([])
    }
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl('')
    setMeta(null)
    setThumbs([])
    setTrimStart(0)
    setTrimEnd(0)
    setError('')
    setFileId('')
  }

  const trim = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('start_time', String(trimStart))
      formData.append('end_time', String(trimEnd))
      const data = await uploadFile('trim/video', formData)
      setFileId(data.file_id)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Trim failed')
    } finally {
      setBusy(false)
    }
  }

  const durationSec = Math.max(1, Math.floor(meta?.duration || 0))
  const trimStartPct = (trimStart / durationSec) * 100
  const trimEndPct = 100 - (trimEnd / durationSec) * 100

  return (
    <ToolPage
      crumb="Video Trim"
      emoji="✂️"
      title="Video Trim"
      subtitle="Trim and cut video files down to the part you need."
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
            rightBadge={`${formatDuration(trimStart)} / ${formatDuration(meta?.duration || 0)}`}
            maxHeight={360}
            style={{ marginTop: 24 }}
          />

          <div
            style={{
              marginTop: 16,
              position: 'relative',
              height: 64,
              background: 'var(--tile-soft)',
              border: '2px solid var(--border)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              {Array.from({ length: THUMB_COUNT }).map((_, i) =>
                thumbs[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={thumbs[i]}
                    alt=""
                    style={{
                      flex: 1,
                      minWidth: 0,
                      objectFit: 'cover',
                      borderRight: '1px solid var(--border)',
                      height: '100%',
                    }}
                  />
                ) : (
                  <div
                    key={i}
                    className="stripes-fine"
                    style={{ flex: 1, borderRight: '1px solid var(--border)' }}
                  />
                )
              )}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                background: 'oklch(58% 0.135 250 / 0.18)',
                borderLeft: '4px solid var(--accent)',
                borderRight: '4px solid var(--accent)',
                left: `${trimStartPct}%`,
                right: `${trimEndPct}%`,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={durationSec}
            value={trimStart}
            onChange={(e) => {
              setTrimStart(Math.min(Number(e.target.value), trimEnd - 1))
              setFileId('')
            }}
            style={{ width: '100%', marginTop: 10 }}
          />
          <input
            type="range"
            min={0}
            max={durationSec}
            value={trimEnd}
            onChange={(e) => {
              setTrimEnd(Math.max(Number(e.target.value), trimStart + 1))
              setFileId('')
            }}
            style={{ width: '100%', marginTop: 4, accentColor: 'var(--accent-dark)' }}
          />

          <TrimStats
            startLabel={formatDuration(trimStart)}
            endLabel={formatDuration(trimEnd)}
            clipLabel={formatDuration(Math.max(0, trimEnd - trimStart))}
          />

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            {fileId ? (
              <DonePanel
                filename={file.name}
                meta={`${formatDuration(Math.max(0, trimEnd - trimStart))} clip · ready`}
                onDownload={() => downloadFile(fileId)}
                onReset={reset}
                resetLabel="Trim another"
              />
            ) : (
              <>
                <button className="btn-primary" onClick={trim} disabled={busy || !meta}>
                  {busy ? 'Trimming...' : '✂️ Trim & download'}
                </button>
                <button className="btn-secondary" onClick={reset} disabled={busy}>
                  Choose different file
                </button>
              </>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
