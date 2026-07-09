'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { getApiUrl, uploadFile, downloadFile, formatFileSize } from '@/lib/api'

const FORMATS = ['PNG', 'JPG']
const DPIS = ['72', '150', '300']

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [format, setFormat] = useState('PNG')
  const [dpi, setDpi] = useState('150')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ zip_file_id: string | null; num_pages: number } | null>(null)

  const onFiles = async (files: File[]) => {
    const f = files[0]
    setFile(f)
    setError('')
    setResult(null)
    setNumPages(0)
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch(`${getApiUrl()}/api/v1/pdf/info`, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setNumPages(data.num_pages || 0)
      }
    } catch {
      /* grid stays hidden without a page count */
    }
  }

  const reset = () => {
    setFile(null)
    setNumPages(0)
    setFormat('PNG')
    setDpi('150')
    setError('')
    setResult(null)
  }

  const extract = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format.toLowerCase())
      formData.append('dpi', dpi)
      formData.append('create_zip', 'true')
      const data = await uploadFile('pdf/to-images', formData)
      setResult(data)
      if (data.zip_file_id) downloadFile(data.zip_file_id)
    } catch (err: any) {
      setError(err.message || 'Extraction failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      crumb="PDF to Images"
      emoji="🖼️"
      title="PDF to Images"
      subtitle="Extract every page of a PDF as an image."
    >
      {!file ? (
        <Dropzone
          emoji="📄"
          label="Drag & drop a PDF, or click to browse"
          hint="PDF up to 200 MB"
          accept="application/pdf"
          onFiles={onFiles}
        />
      ) : (
        <>
          <div style={{ marginTop: 24, fontSize: 13, color: 'var(--muted)' }}>
            {file.name}
            {numPages ? ` · ${numPages} pages` : ''} · {formatFileSize(file.size)}
          </div>

          <div className="pixel-card notch-6" style={{ marginTop: 16, padding: 20, boxShadow: 'none' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>
                  Format
                </div>
                <Chips
                  options={FORMATS.map((f) => ({ value: f, label: f }))}
                  value={format}
                  onChange={(f) => {
                    setFormat(f)
                    setResult(null)
                  }}
                  style={{ marginTop: 0 }}
                />
              </div>
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>
                  Resolution
                </div>
                <Chips
                  options={DPIS.map((d) => ({ value: d, label: `${d} DPI` }))}
                  value={dpi}
                  onChange={(d) => {
                    setDpi(d)
                    setResult(null)
                  }}
                  style={{ marginTop: 0 }}
                />
              </div>
            </div>
          </div>

          {numPages > 0 && (
            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 10,
              }}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i}
                  className="stripes-fine font-pixel"
                  style={{
                    aspectRatio: '3/4',
                    border: '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: 'var(--muted)',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22 }}>
            {result ? (
              <DonePanel
                filename={`${file.name.replace(/\.pdf$/i, '')}-pages.zip`}
                meta={`${result.num_pages} images · ${format} · ready`}
                onDownload={() => result.zip_file_id && downloadFile(result.zip_file_id)}
                onReset={reset}
                resetLabel="Extract another"
              />
            ) : (
              <button className="btn-primary" onClick={extract} disabled={busy}>
                {busy ? 'Extracting...' : '⬇ Download all as .zip'}
              </button>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
