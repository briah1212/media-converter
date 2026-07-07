'use client'

import { useState } from 'react'
import Link from 'next/link'

type SplitMode = 'pages' | 'ranges'

export default function PDFSplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<SplitMode>('pages')
  const [pages, setPages] = useState('')
  const [ranges, setRanges] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError('')
      setResult(null)
    }
  }

  const validateInput = (): boolean => {
    if (mode === 'pages') {
      if (!pages.trim()) {
        setError('Please enter page numbers (e.g., 1,3,5)')
        return false
      }
      // Validate pages format: should be numbers separated by commas
      const pagePattern = /^(\d+)(,\s*\d+)*$/
      if (!pagePattern.test(pages.trim())) {
        setError('Invalid page format. Use comma-separated numbers (e.g., 1,3,5)')
        return false
      }
    } else {
      if (!ranges.trim()) {
        setError('Please enter page ranges (e.g., 1-5,10-15)')
        return false
      }
      // Validate ranges format: should be number-number separated by commas
      const rangePattern = /^(\d+-\d+)(,\s*\d+-\d+)*$/
      if (!rangePattern.test(ranges.trim())) {
        setError('Invalid range format. Use format like 1-5,10-15')
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a PDF file')
      return
    }

    if (!validateInput()) {
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', mode)
      
      if (mode === 'pages') {
        formData.append('pages', pages.trim())
      } else {
        formData.append('ranges', ranges.trim())
      }

      const response = await fetch(`${API_URL}/api/v1/pdf/split`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Split failed')
      }

      const data = await response.json()
      setResult(data)
      setFile(null)
      setPages('')
      setRanges('')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPages('')
    setRanges('')
    setResult(null)
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem',
    }}>
      <Link href="/" style={{
        color: 'white',
        textDecoration: 'none',
        marginBottom: '2rem',
        fontSize: '1rem',
      }}>
        ← Back to Home
      </Link>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
        maxWidth: '650px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333',
        }}>
          ✂️ PDF Split
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Split PDF by pages or ranges
        </p>

        {!result ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333',
              }}>
                Select PDF File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,application/pdf"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              {file && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#333',
                }}>
                  <strong>{file.name}</strong> ({formatFileSize(file.size)})
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontWeight: '500',
                color: '#333',
              }}>
                Split Mode
              </label>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                backgroundColor: '#f3f4f6',
                padding: '0.25rem',
                borderRadius: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setMode('pages')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    backgroundColor: mode === 'pages' ? '#667eea' : 'transparent',
                    color: mode === 'pages' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  By Pages
                </button>
                <button
                  type="button"
                  onClick={() => setMode('ranges')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    backgroundColor: mode === 'ranges' ? '#667eea' : 'transparent',
                    color: mode === 'ranges' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  By Ranges
                </button>
              </div>
            </div>

            {mode === 'pages' ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#333',
                }}>
                  Page Numbers
                </label>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="e.g., 1,3,5,7"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
                <p style={{
                  fontSize: '0.875rem',
                  color: '#999',
                  marginTop: '0.5rem',
                }}>
                  Enter comma-separated page numbers to extract
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#333',
                }}>
                  Page Ranges
                </label>
                <input
                  type="text"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder="e.g., 1-5,10-15,20-25"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
                <p style={{
                  fontSize: '0.875rem',
                  color: '#999',
                  marginTop: '0.5rem',
                }}>
                  Enter comma-separated page ranges (e.g., 1-5,10-15)
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !file}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: loading || !file ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => {
                if (!loading && file) e.currentTarget.style.backgroundColor = '#5568d3'
              }}
              onMouseLeave={(e) => {
                if (!loading && file) e.currentTarget.style.backgroundColor = '#667eea'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem',
                  }} />
                  Splitting PDF...
                </span>
              ) : 'Split PDF'}
            </button>
          </form>
        ) : (
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#16a34a',
            }}>
              ✅ PDF Split Successfully!
            </h3>
            <p style={{ color: '#333', marginBottom: '1rem' }}>
              {result.message || 'Your PDF has been split.'}
            </p>
            {result.metadata && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}>
                {result.metadata.output_pdfs && (
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Output PDFs:</strong> {result.metadata.output_pdfs}
                  </div>
                )}
                {result.metadata.mode && (
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Split Mode:</strong> {result.metadata.mode}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  if (result.file_id) {
                    window.open(`${API_URL}/api/v1/download/${result.file_id}`, '_blank')
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
              >
                Download ZIP
              </button>
              <button
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5568d3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
              >
                Split Another
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
