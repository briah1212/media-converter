'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import FileInfoCard from '@/components/ui/FileInfoCard'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize, formatDuration } from '@/lib/api'
import { loadMediaMeta, MediaMeta } from '@/lib/media'

const FORMATS = ['MP3', 'WAV', 'AAC', 'FLAC', 'OGG']

export default function AudioConvert() {
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<MediaMeta | null>(null)
  const [format, setFormat] = useState('MP3')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setError('')
    setFileId('')
    try {
      setMeta(await loadMediaMeta(f, 'audio'))
    } catch {
      setMeta(null)
    }
  }

  const reset = () => {
    setFile(null)
    setMeta(null)
    setError('')
    setFileId('')
    setFormat('MP3')
  }

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('output_format', format.toLowerCase())
      const data = await uploadFile('audio/convert', formData)
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
    file ? formatFileSize(file.size) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ToolPage
      crumb="Audio Convert"
      emoji="🎧"
      title="Audio Convert"
      subtitle="Convert audio files between different formats."
    >
      {!file ? (
        <Dropzone
          emoji="🎵"
          label="Drag & drop an audio file, or click to browse"
          hint="MP3, WAV, M4A, FLAC, OGG up to 200 MB"
          accept="audio/*"
          onFiles={onFiles}
        />
      ) : (
        <>
          <FileInfoCard emoji="🎧" name={file.name} meta={metaLine} onRemove={reset} />

          <div className="pixel-card notch-6" style={{ marginTop: 22, padding: 22, boxShadow: 'none' }}>
            <div className="label-caps">Output format</div>
            <Chips
              options={FORMATS.map((f) => ({ value: f, label: f }))}
              value={format}
              onChange={(f) => {
                setFormat(f)
                setFileId('')
              }}
              style={{ marginTop: 10 }}
            />
          </div>

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            {fileId ? (
              <DonePanel
                filename={file.name.replace(/\.[^.]+$/, `.${format.toLowerCase()}`)}
                meta={`${format} · ready`}
                onDownload={() => downloadFile(fileId)}
                onReset={reset}
              />
            ) : (
              <>
                <button className="btn-primary" onClick={convert} disabled={busy}>
                  {busy ? 'Converting...' : `⬇ Download ${format}`}
                </button>
                <button className="btn-secondary" onClick={reset} disabled={busy}>
                  Start over
                </button>
              </>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
