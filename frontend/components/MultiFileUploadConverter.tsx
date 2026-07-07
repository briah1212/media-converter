'use client'

import { useState } from 'react'

interface MultiFileUploadConverterProps {
  endpoint: string
  title: string
  description: string
  acceptedFormats: string
  minFiles?: number
  maxFiles?: number
}

export default function MultiFileUploadConverter({
  endpoint,
  title,
  description,
  acceptedFormats,
  minFiles = 2,
  maxFiles = 10
}: MultiFileUploadConverterProps) {
  const [files, setFiles] = useState<File[]>([])
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

  const isValidFormat = (fileName: string): boolean => {
    const formats = acceptedFormats.split(',').map(f => f.trim().toLowerCase())
    const fileExt = '.' + fileName.split('.').pop()?.toLowerCase()
    return formats.includes(fileExt)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    if (selectedFiles.length === 0) return

    // Validate file formats
    const invalidFiles = selectedFiles.filter(f => !isValidFormat(f.name))
    if (invalidFiles.length > 0) {
      setError(`Invalid file format(s). Accepted formats: ${acceptedFormats}`)
      return
    }

    // Check max files limit
    const totalFiles = files.length + selectedFiles.length
    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    setFiles(prev => [...prev, ...selectedFiles])
    setError('')
    setResult(null)
    
    // Reset file input
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getTotalSize = (): string => {
    const total = files.reduce((sum, file) => sum + file.size, 0)
    return formatFileSize(total)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (files.length < minFiles) {
      setError(`Please select at least ${minFiles} files`)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append('files', file)
      })

      const response = await fetch(`${API_URL}/api/v1/${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Conversion failed')
      }

      const data = await response.json()
      setResult(data)
      setFiles([])
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFiles([])
    setResult(null)
    setError('')
  }

  return (
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
        {title}
      </h1>
      <p style={{
        color: '#666',
        marginBottom: '1rem',
      }}>
        {description}
      </p>
      <p style={{
        color: '#667eea',
        fontSize: '0.875rem',
        marginBottom: '2rem',
        fontWeight: '500',
      }}>
        Select {minFiles}-{maxFiles} files
      </p>

      {!result ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="file-input"
              style={{
                display: 'block',
                width: '100%',
                padding: '1.5rem',
                border: '2px dashed #667eea',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#f9fafb',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.borderColor = '#5568d3'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.borderColor = '#667eea'
              }}
            >
              <div style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
              }}>
                📁
              </div>
              <div style={{
                color: '#667eea',
                fontWeight: '600',
                marginBottom: '0.25rem',
              }}>
                Click to select files
              </div>
              <div style={{
                color: '#666',
                fontSize: '0.875rem',
              }}>
                or drag and drop
              </div>
              <div style={{
                color: '#999',
                fontSize: '0.75rem',
                marginTop: '0.5rem',
              }}>
                {acceptedFormats}
              </div>
            </label>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              accept={acceptedFormats}
              style={{ display: 'none' }}
            />
          </div>

          {files.length > 0 && (
            <div style={{
              marginBottom: '1.5rem',
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e5e7eb',
              }}>
                <span style={{ fontWeight: '600', color: '#333' }}>
                  {files.length} file(s) selected
                </span>
                <span style={{ fontSize: '0.875rem', color: '#666' }}>
                  Total: {getTotalSize()}
                </span>
              </div>
              {files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ flex: 1, marginRight: '1rem' }}>
                    <div style={{
                      fontWeight: '500',
                      color: '#333',
                      fontSize: '0.875rem',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#666',
                    }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || files.length < minFiles}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: loading || files.length < minFiles ? '#9ca3af' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading || files.length < minFiles ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              if (!loading && files.length >= minFiles) {
                e.currentTarget.style.backgroundColor = '#5568d3'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && files.length >= minFiles) {
                e.currentTarget.style.backgroundColor = '#667eea'
              }
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
                Processing {files.length} file(s)...
              </span>
            ) : `Process Files (${files.length})`}
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
            Success!
          </h3>
          <p style={{ color: '#333', marginBottom: '1rem' }}>
            {result.message || 'Files processed successfully!'}
          </p>
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: 'white',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}>
              {Object.entries(result.metadata).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '0.25rem' }}>
                  <strong>{key}:</strong> {String(value)}
                </div>
              ))}
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
              Download Result
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
              Process More Files
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
  )
}
