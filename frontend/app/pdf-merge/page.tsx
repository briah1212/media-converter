'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FileItem {
  id: string
  file: File
  size: string
}

export default function PDFMergePage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [outputFilename, setOutputFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Only PDF files are allowed')
    } else {
      setError('')
    }

    const newFiles: FileItem[] = pdfFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      size: formatFileSize(file.size)
    }))

    setFiles(prev => [...prev, ...newFiles])
  }

  const handleRemoveFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newFiles = [...files]
    const draggedFile = newFiles[draggedIndex]
    newFiles.splice(draggedIndex, 1)
    newFiles.splice(index, 0, draggedFile)
    
    setFiles(newFiles)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to merge')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      files.forEach(fileItem => {
        formData.append('files', fileItem.file)
      })
      if (outputFilename) {
        formData.append('output_filename', outputFilename)
      }

      const response = await fetch(`${API_URL}/api/v1/pdf/merge`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Merge failed')
      }

      const data = await response.json()
      setResult(data)
      setFiles([])
      setOutputFilename('')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFiles([])
    setOutputFilename('')
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
        maxWidth: '700px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333',
        }}>
          📄 PDF Merge
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Merge multiple PDF files into one document
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
                Select PDF Files
              </label>
              <input
                type="file"
                onChange={handleFilesSelect}
                accept=".pdf,application/pdf"
                multiple
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
              <p style={{
                fontSize: '0.875rem',
                color: '#999',
                marginTop: '0.5rem',
              }}>
                Select at least 2 PDF files. Drag to reorder.
              </p>
            </div>

            {files.length > 0 && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #e5e7eb',
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '0.75rem',
                }}>
                  Files to Merge ({files.length})
                </h3>
                {files.map((fileItem, index) => (
                  <div
                    key={fileItem.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                      cursor: 'move',
                      border: draggedIndex === index ? '2px solid #667eea' : '1px solid #e5e7eb',
                      opacity: draggedIndex === index ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <span style={{ fontSize: '1.25rem', color: '#667eea' }}>☰</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', color: '#333', fontWeight: '500' }}>
                          {index + 1}. {fileItem.file.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#999' }}>
                          {fileItem.size}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(fileItem.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333',
              }}>
                Output Filename (Optional)
              </label>
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="merged_document.pdf"
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
            </div>

            <button
              type="submit"
              disabled={loading || files.length < 2}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: loading || files.length < 2 ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || files.length < 2 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => {
                if (!loading && files.length >= 2) e.currentTarget.style.backgroundColor = '#5568d3'
              }}
              onMouseLeave={(e) => {
                if (!loading && files.length >= 2) e.currentTarget.style.backgroundColor = '#667eea'
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
                  Merging PDFs...
                </span>
              ) : 'Merge PDFs'}
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
              ✅ PDFs Merged Successfully!
            </h3>
            {result.metadata && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}>
                {result.metadata.pdfs_merged && (
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>PDFs Merged:</strong> {result.metadata.pdfs_merged}
                  </div>
                )}
                {result.metadata.total_pages && (
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Total Pages:</strong> {result.metadata.total_pages}
                  </div>
                )}
                {result.metadata.output_size && (
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>File Size:</strong> {result.metadata.output_size}
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
                Download Merged PDF
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
                Merge Another
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
