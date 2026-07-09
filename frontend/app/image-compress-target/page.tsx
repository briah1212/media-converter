'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import PreviewPane from '@/components/ui/PreviewPane'
import ActionRow from '@/components/ui/ActionRow'
import Chips from '@/components/ui/Chips'
import { ErrorPanel } from '@/components/ui/panels'
import { getApiUrl, uploadFile, downloadFile, formatFileSize } from '@/lib/api'

const PRESETS = [
  { label: '200 KB', value: 200, unit: 'KB' },
  { label: '500 KB', value: 500, unit: 'KB' },
  { label: '2 MB', value: 2, unit: 'MB' },
]

interface Result {
  file_id: string
  actual_size_kb: number
  quality_used: number
}

export default function TargetSizeCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [targetValue, setTargetValue] = useState(500)
  const [unit, setUnit] = useState('KB')
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
    setTargetValue(500)
    setUnit('KB')
  }

  const compress = async () => {
    if (!file || !targetValue) return
    setBusy(true)
    setError('')
    try {
      const targetKb = unit === 'MB' ? Math.round(targetValue * 1024) : Math.round(targetValue)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('target_size_kb', String(targetKb))
      const data = await uploadFile('compress/image/target-size', formData)
      setResult(data)
      downloadFile(data.file_id)
    } catch (err: any) {
      setError(err.message || 'Compression failed')
    } finally {
      setBusy(false)
    }
  }

  const activePreset = PRESETS.find((p) => p.value === targetValue && p.unit === unit)

  return (
    <ToolPage
      crumb="Target Size Compress"
      emoji="🎯"
      title="Target Size Compress"
      subtitle="Compress an image down to a specific file size."
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
              label="Result"
              accent
              imageUrl={result ? `${getApiUrl()}/api/v1/download/${result.file_id}` : null}
              caption="Result appears here"
              meta={
                result ? (
                  <span style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>
                    ≈ {formatFileSize(result.actual_size_kb * 1024)}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--muted)' }}>
                      · quality {result.quality_used}%
                    </span>
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>Pick a target size, then download</span>
                )
              }
            />
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 28, padding: 22, boxShadow: 'none' }}>
            <div className="label-caps">Target size</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
              <input
                type="number"
                className="pixel-input"
                value={targetValue}
                onChange={(e) => {
                  setTargetValue(Number(e.target.value) || 0)
                  setResult(null)
                }}
                style={{ width: 120 }}
              />
              <Chips
                options={['KB', 'MB'].map((u) => ({ value: u, label: u }))}
                value={unit}
                onChange={(u) => {
                  setUnit(u)
                  setResult(null)
                }}
                style={{ marginTop: 0 }}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Chips
                options={PRESETS.map((p) => ({ value: p.label, label: p.label }))}
                value={activePreset?.label || ''}
                onChange={(label) => {
                  const preset = PRESETS.find((p) => p.label === label)!
                  setTargetValue(preset.value)
                  setUnit(preset.unit)
                  setResult(null)
                }}
              />
            </div>
          </div>

          {error && <ErrorPanel message={error} />}

          <ActionRow
            primaryLabel="⬇ Download compressed image"
            busyLabel="Compressing..."
            busy={busy}
            disabled={!targetValue}
            onPrimary={compress}
            secondaryLabel="Start over"
            onSecondary={reset}
          />
        </>
      )}
    </ToolPage>
  )
}
