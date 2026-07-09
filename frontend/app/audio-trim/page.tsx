'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import FileInfoCard from '@/components/ui/FileInfoCard'
import TrimStats from '@/components/ui/TrimStats'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize, formatDuration } from '@/lib/api'
import { loadMediaMeta } from '@/lib/media'

const FALLBACK_WAVE = Array.from({ length: 60 }, (_, i) => 20 + Math.round(Math.abs(Math.sin(i * 0.7)) * 70))

async function computePeaks(file: File, buckets = 60): Promise<number[]> {
  const ctx = new AudioContext()
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
    const data = buffer.getChannelData(0)
    const bucketSize = Math.floor(data.length / buckets)
    const peaks: number[] = []
    for (let i = 0; i < buckets; i++) {
      let max = 0
      const start = i * bucketSize
      for (let j = start; j < start + bucketSize; j += 32) {
        const v = Math.abs(data[j])
        if (v > max) max = v
      }
      peaks.push(Math.max(8, Math.round(max * 100)))
    }
    return peaks
  } finally {
    ctx.close()
  }
}

export default function TrimAudio() {
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [waveBars, setWaveBars] = useState<number[]>(FALLBACK_WAVE)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setError('')
    setFileId('')
    try {
      const meta = await loadMediaMeta(f, 'audio')
      setDuration(meta.duration)
      setTrimStart(0)
      setTrimEnd(Math.floor(meta.duration))
    } catch {
      setDuration(0)
    }
    try {
      setWaveBars(await computePeaks(f))
    } catch {
      setWaveBars(FALLBACK_WAVE)
    }
  }

  const reset = () => {
    setFile(null)
    setDuration(0)
    setWaveBars(FALLBACK_WAVE)
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
      const data = await uploadFile('audio/trim', formData)
      setFileId(data.file_id)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Trim failed')
    } finally {
      setBusy(false)
    }
  }

  const durationSec = Math.max(1, Math.floor(duration))
  const trimStartPct = (trimStart / durationSec) * 100
  const trimEndPct = 100 - (trimEnd / durationSec) * 100

  const metaLine = [duration ? formatDuration(duration) : null, file ? formatFileSize(file.size) : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <ToolPage
      crumb="Trim Audio"
      emoji="✂️"
      title="Trim Audio"
      subtitle="Cut an audio file down to just the part you need."
    >
      {!file ? (
        <Dropzone
          emoji="🎵"
          label="Drag & drop an audio file, or click to browse"
          hint="MP3, WAV, M4A up to 200 MB"
          accept="audio/*"
          onFiles={onFiles}
        />
      ) : (
        <>
          <FileInfoCard emoji="🎧" name={file.name} meta={metaLine} onRemove={reset} />

          <div
            style={{
              marginTop: 16,
              position: 'relative',
              height: 64,
              background: 'var(--tile-soft)',
              border: '2px solid var(--border)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '0 6px',
                overflow: 'hidden',
              }}
            >
              {waveBars.map((h, i) => (
                <div
                  key={i}
                  style={{ flex: 1, minWidth: 2, background: 'var(--border-strong)', height: `${h}%` }}
                />
              ))}
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
              />
            ) : (
              <button className="btn-primary" onClick={trim} disabled={busy || duration === 0}>
                {busy ? 'Trimming...' : '✂️ Trim & download'}
              </button>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
