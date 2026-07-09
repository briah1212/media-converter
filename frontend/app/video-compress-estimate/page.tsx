'use client'

import { useState } from 'react'
import Link from 'next/link'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import FileInfoCard from '@/components/ui/FileInfoCard'
import Chips from '@/components/ui/Chips'
import { formatFileSize, formatDuration } from '@/lib/api'
import { loadMediaMeta, MediaMeta } from '@/lib/media'

const RESOLUTIONS = [
  { label: '480p', factor: 0.22 },
  { label: '720p', factor: 0.4 },
  { label: '1080p', factor: 0.65 },
  { label: '1440p', factor: 1 },
]

export default function CompressionEstimate() {
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<MediaMeta | null>(null)
  const [quality, setQuality] = useState(60)
  const [resolution, setResolution] = useState('1080p')

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    try {
      setMeta(await loadMediaMeta(f, 'video'))
    } catch {
      setMeta(null)
    }
  }

  const reset = () => {
    setFile(null)
    setMeta(null)
    setQuality(60)
    setResolution('1080p')
  }

  const resFactor = RESOLUTIONS.find((r) => r.label === resolution)?.factor ?? 0.65
  const qFactor = 0.15 + (quality / 100) * 0.55
  const estBytes = file ? Math.max(1, file.size * resFactor * qFactor) : 0
  const savedPct = file ? Math.round((1 - estBytes / file.size) * 100) : 0
  const estBitrate = meta?.duration
    ? `${Math.round((estBytes * 8) / meta.duration / 1000)} kbps`
    : '—'

  const metaLine = [
    meta?.duration ? formatDuration(meta.duration) : null,
    meta?.width && meta?.height ? `${meta.width}×${meta.height}` : null,
    file ? formatFileSize(file.size) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ToolPage
      crumb="Compression Estimate"
      emoji="📊"
      title="Compression Estimate"
      subtitle="Preview the result before you commit to compressing."
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
          <FileInfoCard emoji="🎬" name={file.name} meta={metaLine} onRemove={reset} />

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
              onChange={(e) => setQuality(Number(e.target.value))}
              style={{ width: '100%', marginTop: 12 }}
            />

            <div className="label-caps" style={{ marginTop: 18 }}>
              Target resolution
            </div>
            <Chips
              options={RESOLUTIONS.map((r) => ({ value: r.label, label: r.label }))}
              value={resolution}
              onChange={setResolution}
            />
          </div>

          <div
            style={{
              marginTop: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 14,
            }}
          >
            {[
              { label: 'Estimated size', value: `≈ ${formatFileSize(estBytes)}` },
              { label: 'Reduction', value: `${savedPct}%` },
              { label: 'Est. bitrate', value: estBitrate },
            ].map((tile) => (
              <div
                key={tile.label}
                style={{
                  background: 'var(--tile)',
                  border: '2px solid var(--accent-soft)',
                  padding: 16,
                }}
              >
                <div className="label-caps" style={{ fontSize: 11, color: 'var(--accent-dark)' }}>
                  {tile.label}
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontWeight: 700,
                    fontSize: 18,
                    marginTop: 6,
                    color: 'var(--accent-dark)',
                  }}
                >
                  {tile.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <Link
              href="/video-compress"
              className="btn-primary"
              style={{ textDecoration: 'none', display: 'inline-block', color: 'white' }}
            >
              📦 Proceed to compress
            </Link>
          </div>
        </>
      )}
    </ToolPage>
  )
}
