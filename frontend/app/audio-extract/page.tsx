'use client'

import { useRef, useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatDuration } from '@/lib/api'
import { loadMediaMeta, MediaMeta } from '@/lib/media'

const FORMATS = ['MP3', 'WAV', 'AAC']

export default function ExtractAudio() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [meta, setMeta] = useState<MediaMeta | null>(null)
  const [format, setFormat] = useState('MP3')
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileId, setFileId] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

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
    setFormat('MP3')
    setPlaying(false)
    setError('')
    setFileId('')
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  const extract = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('output_format', format.toLowerCase())
      const data = await uploadFile('audio/extract-from-video', formData)
      setFileId(data.file_id)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Extraction failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      crumb="Extract Audio"
      emoji="🎤"
      title="Extract Audio"
      subtitle="Pull the audio track out of any video file."
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
            className="stripes-dark"
            onClick={togglePlay}
            style={{
              marginTop: 24,
              aspectRatio: '16/9',
              maxHeight: 300,
              border: '2px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <video
              ref={videoRef}
              src={previewUrl}
              onEnded={() => setPlaying(false)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
            {!playing && (
              <div
                className="notch-6"
                style={{
                  width: 56,
                  height: 56,
                  background: 'white',
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  position: 'relative',
                }}
              >
                ▶
              </div>
            )}
            <span
              className="font-mono"
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                fontSize: 11,
                background: 'black',
                color: 'white',
                padding: '3px 8px',
                opacity: 0.8,
                maxWidth: '60%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.name}
              {meta?.width && meta?.height ? ` · ${meta.width}×${meta.height}` : ''}
            </span>
            {meta?.duration ? (
              <span
                className="font-mono"
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  fontSize: 11,
                  background: 'black',
                  color: 'white',
                  padding: '3px 8px',
                  opacity: 0.8,
                }}
              >
                {formatDuration(meta.duration)}
              </span>
            ) : null}
          </div>

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
              <button className="btn-primary" onClick={extract} disabled={busy}>
                {busy ? 'Extracting...' : '🎤 Extract & download'}
              </button>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
