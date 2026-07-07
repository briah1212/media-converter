'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ImageBatchCompress() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [targetSizeKb, setTargetSizeKb] = useState(100)
  const [outputFormat, setOutputFormat] = useState('jpeg')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files || files.length === 0) return

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    
    // Append all files
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    
    formData.append('target_size_kb', targetSizeKb.toString())
    formData.append('output_format', outputFormat)
    formData.append('create_zip', 'true')

    try {
      const response = await fetch(`${API_URL}/api/v1/batch/compress/target-size`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Batch compression failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (result && result.zip_file_id) {
      window.open(`${API_URL}/api/v1/download/${result.zip_file_id}`, '_blank')
    }
  }

  const fileArray = files ? Array.from(files) : []
  const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0)

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
        maxWidth: '700px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333',
        }}>
          Batch Image Compression
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Compress multiple images to target size and download as ZIP
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Upload Image Files
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            {files && files.length > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '0.5rem',
                }}>
                  Selected {files.length} file(s) - Total: {(totalSize / 1024 / 1024).toFixed(2)} MB
                </p>
                {fileArray.map((file, index) => (
                  <div key={index} style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    padding: '0.25rem 0',
                    borderBottom: index < fileArray.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Target Size per Image (KB)
            </label>
            <input
              type="number"
              value={targetSizeKb}
              onChange={(e) => setTargetSizeKb(Number(e.target.value))}
              min={1}
              max={50000}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Output Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s',
                backgroundColor: 'white',
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !files || files.length === 0}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: (loading || !files || files.length === 0) ? '#9ca3af' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (loading || !files || files.length === 0) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              if (!loading && files && files.length > 0) e.currentTarget.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              if (!loading && files && files.length > 0) e.currentTarget.style.backgroundColor = '#667eea'
            }}
          >
            {loading ? 'Compressing...' : 'Compress Images'}
          </button>
        </form>

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

        {result && result.success && (
          <div style={{
            marginTop: '1.5rem',
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
              Compression Complete!
            </h3>
            <p style={{
              color: '#333',
              marginBottom: '1rem',
            }}>
              Successfully compressed {result.processed_files || files?.length || 0} image(s). Download the ZIP file below.
            </p>
            <button
              onClick={handleDownload}
              style={{
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
          </div>
        )}
      </div>
    </div>
  )
}
