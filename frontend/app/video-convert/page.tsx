'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import VideoPreview from '@/components/ui/VideoPreview'
import Chips from '@/components/ui/Chips'
import ActionRow from '@/components/ui/ActionRow'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatDuration } from '@/lib/api'
import { loadMediaMeta, MediaMeta } from '@/lib/media'

const FORMATS = ['MP4', 'MOV', 'WEBM', 'AVI', 'MKV']

export default function VideoConvert() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [meta, setMeta] = useState<MediaMeta | null>(null)
  const [format, setFormat] = useState('MP4')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
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
    setPreviewUrl('')
    setMeta(null)
    setFormat('MP4')
    setError('')
    setFileId('')
  }

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('output_format', format.toLowerCase())
      const data = await uploadFile('video/convert-format', formData)
      setFileId(data.file_id)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  const sourceExt = file?.name.split('.').pop()?.toUpperCase()

  return (
    <ToolPage
      crumb="Video Convert"
      emoji="🔄"
      title="Video Convert"
      subtitle="Convert videos between different formats."
    >
      {!file ? (
        <Dropzone
          emoji="🎬"
          label="Drag & drop a video, or click to browse"
          hint="MP4, MOV, WEBM, AVI, MKV up to 2 GB"
          accept="video/*,.mkv,.avi"
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

          <div className="pixel-card notch-6" style={{ marginTop: 22, padding: 22, boxShadow: 'none' }}>
            <div className="label-caps">Output format</div>
            <Chips
              options={FORMATS.filter((f) => f !== sourceExt).map((f) => ({ value: f, label: f }))}
              value={format}
              onChange={(f) => {
                setFormat(f)
                setFileId('')
              }}
              style={{ marginTop: 10 }}
            />
          </div>

          {error && <ErrorPanel message={error} />}

          {fileId ? (
            <div style={{ marginTop: 22 }}>
              <DonePanel
                filename={file.name.replace(/\.[^.]+$/, `.${format.toLowerCase()}`)}
                meta={`${format} · ready`}
                onDownload={() => downloadFile(fileId)}
                onReset={reset}
              />
            </div>
          ) : (
            <ActionRow
              primaryLabel={`⬇ Download ${format}`}
              busyLabel="Converting..."
              busy={busy}
              onPrimary={convert}
              secondaryLabel="Start over"
              onSecondary={reset}
            />
          )}
        </>
      )}
    </ToolPage>
  )
}
