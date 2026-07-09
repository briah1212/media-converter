'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import FileInfoCard from '@/components/ui/FileInfoCard'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize, formatDuration } from '@/lib/api'
import { loadMediaMeta, MediaMeta } from '@/lib/media'

const BITRATES = [128, 192, 256, 320]

export default function Mp4ToMp3() {
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<MediaMeta | null>(null)
  const [bitrate, setBitrate] = useState(192)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setError('')
    setFileId('')
    try {
      setMeta(await loadMediaMeta(f, 'video'))
    } catch {
      setMeta(null)
    }
  }

  const reset = () => {
    setFile(null)
    setMeta(null)
    setError('')
    setFileId('')
    setBitrate(192)
  }

  const estimateSize = (kbps: number) =>
    meta?.duration ? formatFileSize((meta.duration * kbps * 1000) / 8) : null

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bitrate', `${bitrate}k`)
      const data = await uploadFile('convert/mp4-to-mp3', formData)
      setFileId(data.file_id)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  const metaLine = [
    meta?.duration ? formatDuration(meta.duration) : null,
    meta?.width && meta?.height ? `${meta.width}×${meta.height}` : null,
    file ? formatFileSize(file.size) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ToolPage
      crumb="MP4 to MP3"
      emoji="🔄"
      title="MP4 to MP3"
      subtitle="Convert an MP4 video file straight to MP3 audio."
    >
      {!file ? (
        <Dropzone
          emoji="🎬"
          label="Drag & drop an MP4 file, or click to browse"
          hint="MP4 up to 2 GB"
          accept="video/mp4"
          onFiles={onFiles}
        />
      ) : (
        <>
          <FileInfoCard emoji="🎬" name={file.name} meta={metaLine} onRemove={reset} />

          <div className="pixel-card notch-6" style={{ marginTop: 22, padding: 22, boxShadow: 'none' }}>
            <div className="label-caps">Bitrate</div>
            <Chips
              options={BITRATES.map((b) => ({
                value: String(b),
                label: (
                  <>
                    {b}kbps
                    {estimateSize(b) && (
                      <span style={{ opacity: 0.55, fontWeight: 400 }}> · {estimateSize(b)}</span>
                    )}
                  </>
                ),
              }))}
              value={String(bitrate)}
              onChange={(b) => {
                setBitrate(Number(b))
                setFileId('')
              }}
              style={{ marginTop: 10 }}
            />
          </div>

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            {fileId ? (
              <DonePanel
                filename={file.name.replace(/\.[^.]+$/, '.mp3')}
                meta={`${bitrate}kbps · ready`}
                onDownload={() => downloadFile(fileId)}
                onReset={reset}
              />
            ) : (
              <button className="btn-primary" onClick={convert} disabled={busy}>
                {busy ? 'Converting...' : '⬇ Download MP3'}
              </button>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
