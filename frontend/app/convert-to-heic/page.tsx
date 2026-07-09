'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import PreviewPane from '@/components/ui/PreviewPane'
import ActionRow from '@/components/ui/ActionRow'
import { ErrorPanel } from '@/components/ui/panels'
import { uploadFile, downloadFile, formatFileSize } from '@/lib/api'

interface Result {
  file_id: string
  output_size_kb: number
}

export default function ConvertToHeic() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
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
  }

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await uploadFile('convert/to-heic', formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, '') : ''
  const sourceExt = file ? file.name.split('.').pop()?.toUpperCase() : ''
  const savedPct =
    result && file ? Math.max(0, Math.round((1 - (result.output_size_kb * 1024) / file.size) * 100)) : null

  return (
    <ToolPage
      crumb="Convert to HEIC"
      emoji="📷"
      title="Convert to HEIC"
      subtitle="Convert JPG or PNG photos to space-saving HEIC."
    >
      {!file ? (
        <Dropzone
          emoji="🖼️"
          label="Drag & drop JPG or PNG photos, or click to browse"
          hint="JPG, PNG up to 25 MB each"
          accept="image/jpeg,image/png"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div
            style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          >
            <PreviewPane
              label={`Original · ${sourceExt}`}
              imageUrl={previewUrl}
              meta={<span style={{ color: 'var(--muted)' }}>{formatFileSize(file.size)}</span>}
            />
            <PreviewPane
              label="Converted · HEIC"
              accent
              caption={`${baseName}.heic`}
              meta={
                result ? (
                  <span style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>
                    {formatFileSize(result.output_size_kb * 1024)}{' '}
                    {savedPct !== null && (
                      <span style={{ fontWeight: 400, color: 'var(--muted)' }}>
                        · {savedPct}% smaller
                      </span>
                    )}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>Converted photo appears here</span>
                )
              }
            />
          </div>

          {error && <ErrorPanel message={error} />}

          <ActionRow
            primaryLabel="⬇ Download HEIC"
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
