'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import PreviewPane from '@/components/ui/PreviewPane'
import ActionRow from '@/components/ui/ActionRow'
import Chips from '@/components/ui/Chips'
import { ErrorPanel } from '@/components/ui/panels'
import { getApiUrl, uploadFile, downloadFile, formatFileSize } from '@/lib/api'

// label → { ext, api } — most formats go through /convert/image; BMP/TIFF go
// through /compress/image (lossless) and AVIF through /convert/to-avif.
const FORMAT_OPTIONS: { label: string; ext: string }[] = [
  { label: 'PNG', ext: 'png' },
  { label: 'JPG', ext: 'jpg' },
  { label: 'WEBP', ext: 'webp' },
  { label: 'GIF', ext: 'gif' },
  { label: 'BMP', ext: 'bmp' },
  { label: 'TIFF', ext: 'tiff' },
  { label: 'AVIF', ext: 'avif' },
]

interface Result {
  file_id: string
  output_size_kb: number
}

export default function ImageConvert() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [format, setFormat] = useState('JPG')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const sourceExt = file ? file.name.split('.').pop()?.toLowerCase() : undefined
  const options = FORMAT_OPTIONS.filter(
    (f) => f.ext !== sourceExt && !(f.ext === 'jpg' && sourceExt === 'jpeg')
  )
  const selected = FORMAT_OPTIONS.find((f) => f.label === format) || FORMAT_OPTIONS[1]

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
    setFormat('JPG')
  }

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      let data
      if (selected.ext === 'avif') {
        const avifData = new FormData()
        avifData.append('file', file)
        avifData.append('quality', '85')
        data = await uploadFile('convert/to-avif', avifData)
      } else if (selected.ext === 'bmp' || selected.ext === 'tiff') {
        formData.append('mode', 'lossless')
        formData.append('target_format', selected.ext)
        data = await uploadFile('compress/image', formData)
      } else {
        formData.append('output_format', selected.ext === 'jpg' ? 'jpeg' : selected.ext)
        data = await uploadFile('convert/image', formData)
      }
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, '') : ''

  return (
    <ToolPage
      crumb="Image Convert"
      emoji="🔄"
      title="Image Convert"
      subtitle="Convert images between different formats."
    >
      {!file ? (
        <Dropzone
          emoji="🖼️"
          label="Drag & drop an image, or click to browse"
          hint="JPG, PNG, WEBP, GIF, BMP, TIFF up to 25 MB"
          accept="image/*"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div
            style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          >
            <PreviewPane
              label={`Original · ${sourceExt?.toUpperCase() || ''}`}
              imageUrl={previewUrl}
              meta={<span style={{ color: 'var(--muted)' }}>{formatFileSize(file.size)}</span>}
            />
            <PreviewPane
              label={`Converted · ${format}`}
              accent
              imageUrl={
                result && !['bmp', 'tiff'].includes(selected.ext)
                  ? `${getApiUrl()}/api/v1/download/${result.file_id}`
                  : null
              }
              caption={`${baseName}.${selected.ext}`}
              meta={
                result ? (
                  <span style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>
                    {formatFileSize(result.output_size_kb * 1024)}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>Pick a format, then download</span>
                )
              }
            />
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 28, padding: 22, boxShadow: 'none' }}>
            <div className="label-caps">Output format</div>
            <Chips
              options={options.map((f) => ({ value: f.label, label: f.label }))}
              value={format}
              onChange={(f) => {
                setFormat(f)
                setResult(null)
              }}
            />
          </div>

          {error && <ErrorPanel message={error} />}

          <ActionRow
            primaryLabel={`⬇ Download ${format}`}
            busyLabel="Converting..."
            busy={busy}
            onPrimary={convert}
            secondaryLabel="Start over"
            onSecondary={reset}
          />
        </>
      )}
    </ToolPage>
  )
}
