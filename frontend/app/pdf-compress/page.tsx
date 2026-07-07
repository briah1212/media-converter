'use client'

import { useState } from 'react'
import Link from 'next/link'

type CompressionLevel = 'low' | 'medium' | 'high'

export default function PDFCompressPage() {
  const [file, setFile] = useState<File | null>(null)
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a PDF file')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('compression_level', compressionLevel)

      const response = await fetch(`${API_URL}/api/v1/pdf/compress`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Compression failed')
      }

      const data = await response.json()
      setResult(data)
      setFile(null)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setCompressionLevel('medium')
    setResult(null)
    setError('')
  }

  const getCompressionDescription = (level: CompressionLevel) => {
    switch (level) {
      case 'low':
        return 'Minimal compression, best quality'
      case 'medium':
        return 'Balanced compression and quality'
      case 'high':
        return 'Maximum compression, smaller file size'
    }
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
        maxWidth: '600px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333',
        }}>
          🗜️ PDF Compress
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Reduce PDF file size with adjustable compression
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
                Compression Level
              </label>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                {(['low', 'medium', 'high'] as CompressionLevel[]).map((level) => (
                  <label
                    key={level}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1rem',
                      border: `2px solid ${compressionLevel === level ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      backgroundColor: compressionLevel === level ? '#f0f4ff' : 'white',
                    }}
                    onMouseEnter={(e) => {
                      if (compressionLevel !== level) {
                        e.currentTarget.style.borderColor = '#d1d5db'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (compressionLevel !== level) {
                        e.currentTarget.style.borderColor = '#e5e7eb'
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="compression"
                      value={level}
                      checked={compressionLevel === level}
                      onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                      style={{
                        marginRight: '0.75rem',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#333',
                        textTransform: 'capitalize',
                        marginBottom: '0.25rem',
                      }}>
                        {level}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#666',
                      }}>
                        {getCompressionDescription(level)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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
                  Compressing PDF...
                </span>
              ) : 'Compress PDF'}
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
              ✅ PDF Compressed Successfully!
            </h3>
            {result.metadata && (
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}>
                {result.metadata.input_size && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}>
                    <span style={{ color: '#666' }}>Original Size:</span>
                    <span style={{ fontWeight: '600', color: '#333' }}>
                      {result.metadata.input_size}
                    </span>
                  </div>
                )}
                {result.metadata.output_size && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}>
                    <span style={{ color: '#666' }}>Compressed Size:</span>
                    <span style={{ fontWeight: '600', color: '#16a34a' }}>
                      {result.metadata.output_size}
                    </span>
                  </div>
                )}
                {result.metadata.compression_ratio && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '6px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                      Compression Ratio
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>
                      {result.metadata.compression_ratio}
                    </div>
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
                Download Compressed PDF
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
                Compress Another
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
