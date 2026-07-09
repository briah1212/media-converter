'use client'

import { useState } from 'react'
import ToolPage from '@/components/ui/ToolPage'
import Dropzone from '@/components/ui/Dropzone'
import Chips from '@/components/ui/Chips'
import { ErrorPanel, DonePanel } from '@/components/ui/panels'
import { getApiUrl, uploadFile, downloadFile, formatFileSize } from '@/lib/api'

type SplitMode = 'every' | 'all'

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [mode, setMode] = useState<SplitMode>('every')
  const [everyN, setEveryN] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ zip_file_id: string | null; num_files_created: number } | null>(null)

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
    setMode('every')
    setEveryN(5)
    setError('')
    setResult(null)
  }

  const step = mode === 'all' ? 1 : Math.max(1, everyN)
  const outputCount = numPages ? Math.ceil(numPages / step) : 0

  const split = async () => {
    if (!file || !numPages) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (mode === 'all') {
        formData.append('pages', Array.from({ length: numPages }, (_, i) => i + 1).join(','))
      } else {
        const ranges: string[] = []
        for (let start = 1; start <= numPages; start += step) {
          ranges.push(`${start}-${Math.min(start + step - 1, numPages)}`)
        }
        formData.append('ranges', ranges.join(','))
      }
      formData.append('create_zip', 'true')
      const data = await uploadFile('pdf/split', formData)
      setResult(data)
      if (data.zip_file_id) downloadFile(data.zip_file_id)
    } catch (err: any) {
      setError(err.message || 'Split failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage
      crumb="Split PDF"
      emoji="✂️"
      title="Split PDF"
      subtitle="Split a PDF into separate page ranges or single pages."
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

          <Chips
            options={[
              { value: 'every', label: 'Every N pages' },
              { value: 'all', label: 'Every page separately' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m as SplitMode)
              setResult(null)
            }}
            style={{ marginTop: 16 }}
          />

          {mode === 'every' && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Split every</span>
              <input
                type="number"
                className="pixel-input"
                value={everyN}
                min={1}
                onChange={(e) => {
                  setEveryN(Math.max(1, Number(e.target.value) || 1))
                  setResult(null)
                }}
                style={{ width: 70, padding: '8px 10px', fontSize: 13, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, fontWeight: 600 }}>pages</span>
            </div>
          )}

          {numPages > 0 && (
            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 8,
              }}
            >
              {Array.from({ length: numPages }, (_, i) => {
                const num = i + 1
                const boundary = num % step === 0 && num !== numPages
                return (
                  <div
                    key={num}
                    className="font-pixel"
                    style={{
                      aspectRatio: '3/4',
                      background: 'white',
                      border: '2px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: 'var(--muted)',
                      position: 'relative',
                    }}
                  >
                    {num}
                    {boundary && (
                      <div
                        style={{
                          position: 'absolute',
                          right: -5,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: 'var(--accent)',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {outputCount > 0 && (
            <div
              style={{
                marginTop: 22,
                background: 'var(--tile)',
                border: '2px solid var(--accent-soft)',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-dark)' }}>
                Result: {outputCount} files
              </div>
            </div>
          )}

          {error && <ErrorPanel message={error} />}

          <div style={{ marginTop: 22 }}>
            {result ? (
              <DonePanel
                filename={`${file.name.replace(/\.pdf$/i, '')}-split.zip`}
                meta={`${result.num_files_created} files · ready`}
                onDownload={() => result.zip_file_id && downloadFile(result.zip_file_id)}
                onReset={reset}
                resetLabel="Split another"
              />
            ) : (
              <button className="btn-primary" onClick={split} disabled={busy || !numPages}>
                {busy ? 'Splitting...' : '✂️ Split & download .zip'}
              </button>
            )}
          </div>
        </>
      )}
    </ToolPage>
  )
}
