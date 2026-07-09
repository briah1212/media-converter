'use client'

import { useRef, useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Chips from '@/components/ui/Chips'
import { ProgressPanel, DonePanel, ErrorPanel } from '@/components/ui/panels'
import { getApiUrl, downloadFile, formatDuration } from '@/lib/api'

interface SizeOption {
  label: string
  height?: number
  kbps?: number
  size_bytes: number
}

interface VideoInfo {
  title: string
  channel: string
  duration: number
  view_count: number | null
  thumbnail: string | null
  qualities: SizeOption[]
  bitrates: SizeOption[]
}

interface YouTubeToolProps {
  format: 'mp4' | 'mp3'
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  if (mb >= 10) return `${Math.round(mb)} MB`
  return `${mb.toFixed(1)} MB`
}

function formatViews(views: number | null): string {
  if (views == null) return ''
  if (views >= 1e6) return ` · ${(views / 1e6).toFixed(1)}M views`
  if (views >= 1e3) return ` · ${(views / 1e3).toFixed(1)}K views`
  return ` · ${views} views`
}

const COPY = {
  mp4: {
    crumb: 'YouTube to MP4',
    emoji: '🎥',
    title: 'YouTube to MP4',
    subtitle: 'Paste a link, pick a quality, download the video.',
    optionLabel: 'Quality',
    button: '⬇ Download MP4',
    progressLabel: 'Downloading & converting...',
    ext: 'mp4',
  },
  mp3: {
    crumb: 'YouTube to MP3',
    emoji: '🎵',
    title: 'YouTube to MP3',
    subtitle: 'Paste a link, pick a bitrate, download the audio.',
    optionLabel: 'Bitrate',
    button: '⬇ Download MP3',
    progressLabel: 'Extracting & encoding...',
    ext: 'mp3',
  },
}

export default function YouTubeTool({ format }: YouTubeToolProps) {
  const copy = COPY[format]
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [selected, setSelected] = useState('')
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const options = info ? (format === 'mp4' ? info.qualities : info.bitrates) : []
  const selectedOption = options.find((o) => o.label === selected)

  const fetchInfo = async () => {
    if (!url || fetching) return
    setFetching(true)
    setError('')
    setInfo(null)
    setPhase('idle')
    setProgress(0)
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/youtube/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Could not fetch video info')
      }
      const data: VideoInfo = await res.json()
      setInfo(data)
      const opts = format === 'mp4' ? data.qualities : data.bitrates
      const preferred =
        format === 'mp4'
          ? opts.find((o) => o.label === '720p') || opts[opts.length - 1]
          : opts.find((o) => o.label === '192kbps') || opts[0]
      setSelected(preferred?.label || '')
    } catch (err: any) {
      setError(err.message || 'Could not fetch video info')
    } finally {
      setFetching(false)
    }
  }

  const startDownload = async () => {
    if (!info) return
    setPhase('downloading')
    setProgress(0)
    setError('')
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      setProgress((p) => Math.min(95, p + Math.max(0.4, (95 - p) / 24)))
    }, 300)
    try {
      const body: Record<string, unknown> = { url, format }
      if (format === 'mp4' && selectedOption?.height) body.quality = selectedOption.height
      if (format === 'mp3' && selectedOption?.kbps) body.bitrate = selectedOption.kbps
      const res = await fetch(`${getApiUrl()}/api/v1/youtube/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Download failed')
      }
      const data = await res.json()
      setFileId(data.file_id)
      setProgress(100)
      setPhase('done')
    } catch (err: any) {
      setError(err.message || 'Download failed')
      setPhase('idle')
    } finally {
      if (timer.current) clearInterval(timer.current)
    }
  }

  const reset = () => {
    setPhase('idle')
    setProgress(0)
    setFileId('')
  }

  const filename = info
    ? `${info.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}.${copy.ext}`
    : ''

  return (
    <ToolPage crumb={copy.crumb} emoji={copy.emoji} title={copy.title} subtitle={copy.subtitle}>
      <div className="pixel-card notch-6" style={{ marginTop: 28, padding: 20 }}>
        <label className="label-caps">Video URL</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <input
            className="pixel-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
            placeholder="https://youtube.com/watch?v=..."
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            onClick={fetchInfo}
            disabled={fetching || !url}
            style={{ padding: '0 22px', fontSize: 14 }}
          >
            {fetching ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
      </div>

      {error && <ErrorPanel message={error} />}

      {info && (
        <>
          <div
            style={{
              marginTop: 20,
              display: 'grid',
              gridTemplateColumns: '280px 1fr',
              gap: 20,
            }}
          >
            <div
              className="stripes"
              style={{
                aspectRatio: '16/9',
                border: '2px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {info.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={info.thumbnail}
                  alt={info.title}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    background: 'white',
                    padding: '4px 8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  VIDEO THUMBNAIL
                </span>
              )}
              <span
                className="font-mono"
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  fontSize: 11,
                  background: 'black',
                  color: 'white',
                  padding: '2px 6px',
                  opacity: 0.75,
                }}
              >
                {formatDuration(info.duration)}
              </span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{info.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {info.channel}
                {formatViews(info.view_count)}
              </div>

              <div className="label-caps" style={{ marginTop: 18 }}>
                {copy.optionLabel}
              </div>
              <Chips
                options={options.map((o) => ({
                  value: o.label,
                  label: (
                    <>
                      {o.label}{' '}
                      <span style={{ opacity: 0.55, fontWeight: 400 }}>
                        · {formatSize(o.size_bytes)}
                      </span>
                    </>
                  ),
                }))}
                value={selected}
                onChange={setSelected}
              />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            {phase === 'idle' && (
              <button className="btn-primary" onClick={startDownload}>
                {copy.button}
              </button>
            )}
            {phase === 'downloading' && (
              <ProgressPanel label={copy.progressLabel} progress={progress} />
            )}
            {phase === 'done' && (
              <DonePanel
                filename={filename}
                meta={`${selected}${selectedOption ? ` · ~${formatSize(selectedOption.size_bytes)}` : ''} · ready`}
                onDownload={() => downloadFile(fileId)}
                onReset={reset}
              />
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
