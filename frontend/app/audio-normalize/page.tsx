'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import FileInfoCard from '@/components/ui/FileInfoCard'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize, formatDuration } from '@/lib/api'
import { loadMediaMeta } from '@/lib/media'

const PRESETS = [
  { label: 'Podcast −16', value: -16 },
  { label: 'Streaming −14', value: -14 },
  { label: 'Broadcast −23', value: -23 },
]

// Fallback bars if the browser can't decode the file (matches design seed)
const FALLBACK_BARS = [
  22, 55, 70, 40, 85, 60, 30, 75, 90, 45, 20, 65, 80, 35, 50, 95, 60, 25, 70, 40, 55, 80, 30, 60,
  45, 90, 20, 65, 75, 50, 35, 85, 55, 40, 70, 25, 60, 90, 45, 30,
]

async function computePeaks(file: File, buckets = 40): Promise<number[]> {
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
      peaks.push(max)
    }
    return peaks
  } finally {
    ctx.close()
  }
}

export default function AudioNormalize() {
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [targetLufs, setTargetLufs] = useState(-14)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setError('')
    setFileId('')
    try {
      setPeaks(await computePeaks(f))
    } catch {
      setPeaks(null)
    }
    try {
      const meta = await loadMediaMeta(f, 'audio')
      setDuration(meta.duration)
    } catch {
      setDuration(0)
    }
  }

  const reset = () => {
    setFile(null)
    setPeaks(null)
    setDuration(0)
    setTargetLufs(-14)
    setError('')
    setFileId('')
  }

  const normalize = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('target_level', String(targetLufs))
      const data = await uploadFile('audio/normalize', formData)
      setFileId(data.file_id)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Normalization failed')
    } finally {
      setBusy(false)
    }
  }

  // Before: measured peaks (or fallback). After: uniformly rescaled so the
  // loudest bar hits a ceiling mapped from the LUFS target (-23 → 60%, -9 → 96%).
  const beforeBars = peaks ? peaks.map((p) => Math.max(6, Math.round(p * 100))) : FALLBACK_BARS
  const ceiling = 60 + ((targetLufs + 23) / 14) * 36
  const maxBefore = Math.max(...beforeBars, 1)
  const afterBars = beforeBars.map((b) => Math.max(8, Math.round((b / maxBefore) * ceiling)))

  const activePreset = PRESETS.find((p) => p.value === targetLufs)

  const metaLine = [duration ? formatDuration(duration) : null, file ? formatFileSize(file.size) : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <ToolPage
      crumb="Audio Normalize"
      emoji="🔊"
      title="Audio Normalize"
      subtitle="Even out volume levels to a consistent loudness target."
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

          <div style={{ marginTop: 20 }}>
            <div className="label-caps" style={{ marginBottom: 8 }}>
              Before
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                height: 56,
                background: 'var(--tile-soft)',
                border: '2px solid var(--border)',
                padding: '0 10px',
                overflow: 'hidden',
              }}
            >
              {beforeBars.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    minWidth: 3,
                    background: 'var(--border-strong)',
                    height: `${h}%`,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="label-caps" style={{ marginBottom: 8, color: 'var(--accent-dark)' }}>
              After · normalized to {targetLufs} LUFS
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                height: 56,
                background: 'var(--tile)',
                border: '2px solid var(--accent-soft)',
                padding: '0 10px',
                overflow: 'hidden',
              }}
            >
              {afterBars.map((h, i) => (
                <div
                  key={i}
                  style={{ flex: 1, minWidth: 3, background: 'var(--accent)', height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 24, padding: 22, boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">Target loudness</span>
              <span className="label-caps">{targetLufs} LUFS</span>
            </div>
            <input
              type="range"
              min={-23}
              max={-9}
              value={targetLufs}
              onChange={(e) => {
                setTargetLufs(Number(e.target.value))
                setFileId('')
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
              <span>Quiet (broadcast −23)</span>
              <span>Loud (streaming −9)</span>
            </div>

            <Chips
              options={PRESETS.map((p) => ({ value: p.label, label: p.label }))}
              value={activePreset?.label || ''}
              onChange={(label) => {
                const preset = PRESETS.find((p) => p.label === label)!
                setTargetLufs(preset.value)
                setFileId('')
              }}
              style={{ marginTop: 16 }}
            />
          </div>

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            {fileId ? (
              <DonePanel
                filename={file.name}
                meta={`${targetLufs} LUFS · ready`}
                onDownload={() => downloadFile(fileId)}
                onReset={reset}
              />
            ) : (
              <button className="btn-primary" onClick={normalize} disabled={busy}>
                {busy ? 'Normalizing...' : '⬇ Download normalized audio'}
              </button>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
