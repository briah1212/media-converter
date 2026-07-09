'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import PreviewPane from '@/components/ui/PreviewPane'
import ActionRow from '@/components/ui/ActionRow'
import Chips from '@/components/ui/Chips'
import { ErrorPanel } from '@/components/ui/panels'
import { getApiUrl, uploadFile, downloadFile, formatFileSize } from '@/lib/api'

const FORMATS = ['JPG', 'PNG', 'WEBP']

interface Result {
  file_id: string
  output_size_kb: number
  compression_ratio: number
  dimensions: string
}

export default function ImageCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [quality, setQuality] = useState(75)
  const [format, setFormat] = useState('JPG')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const onFiles = (files: File[]) => {
    setFile(files[0])
    setPreviewUrl(URL.createObjectURL(files[0]))
    setResult(null)
    setError('')
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl('')
    setResult(null)
    setError('')
    setQuality(75)
    setFormat('JPG')
  }

  const compress = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('quality', String(quality))
      formData.append('format', format.toLowerCase() === 'jpg' ? 'jpeg' : format.toLowerCase())
      const data = await uploadFile('compress/image', formData)
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
      crumb="Image Compress"
      emoji="📦"
      title="Image Compress"
      subtitle="Compress images while maintaining quality."
    >
      {!file ? (
        <Dropzone
          emoji="🖼️"
          label="Drag & drop an image, or click to browse"
          hint="JPG, PNG, WEBP up to 25 MB"
          accept="image/jpeg,image/png,image/webp"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div
            style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          >
            <PreviewPane
              label="Original"
              imageUrl={previewUrl}
              meta={<span style={{ color: 'var(--muted)' }}>{formatFileSize(file.size)}</span>}
            />
            <PreviewPane
              label="Compressed"
              accent
              imageUrl={result ? `${getApiUrl()}/api/v1/download/${result.file_id}` : null}
              caption="Compressed preview appears here"
              meta={
                result ? (
                  <span style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>
                    {formatFileSize(result.output_size_kb * 1024)}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--muted)' }}>
                      {result.compression_ratio > 0
                        ? `· ${result.compression_ratio}% smaller`
                        : '· already optimized'}
                    </span>
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>Pick a quality, then download</span>
                )
              }
            />
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 28, padding: 22, boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">Quality</span>
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
              <span>Smaller file</span>
              <span>Higher quality</span>
            </div>

            <div className="label-caps" style={{ marginTop: 18 }}>
              Output format
            </div>
            <Chips
              options={FORMATS.map((f) => ({ value: f, label: f }))}
              value={format}
              onChange={(f) => {
                setFormat(f)
                setResult(null)
              }}
            />
          </div>

          {error && <ErrorPanel message={error} />}

          <ActionRow
            primaryLabel="⬇ Download compressed image"
            busyLabel="Compressing..."
            busy={busy}
            onPrimary={compress}
            secondaryLabel="Start over"
            onSecondary={reset}
          />
        </>
      )}
    </ToolPage>
  )
}
