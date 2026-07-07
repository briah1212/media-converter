'use client'

import { useState } from 'react'

interface AdditionalField {
  name: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
  placeholder?: string
  required?: boolean
  defaultValue?: string | number
}

interface FileUploadConverterProps {
  endpoint: string
  title: string
  description: string
  acceptedFormats: string
  additionalFields?: AdditionalField[]
}

export default function FileUploadConverter({
  endpoint,
  title,
  description,
  acceptedFormats,
  additionalFields = []
}: FileUploadConverterProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})

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
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!isValidFormat(selectedFile.name)) {
        setError(`Invalid file format. Accepted formats: ${acceptedFormats}`)
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError('')
      setResult(null)
    }
  }

  const handleFieldChange = (name: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Add additional field values
      additionalFields.forEach(field => {
        const value = fieldValues[field.name] ?? field.defaultValue
        if (value !== undefined && value !== '') {
          formData.append(field.name, value.toString())
        }
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
      setFile(null)
      setFieldValues({})
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError('')
    setFieldValues({})
  }

  return (
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
        {title}
      </h1>
      <p style={{
        color: '#666',
        marginBottom: '2rem',
      }}>
        {description}
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
              Select File
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept={acceptedFormats}
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

          {additionalFields.map((field) => (
            <div key={field.name} style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333',
              }}>
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={fieldValues[field.name] ?? field.defaultValue ?? ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={fieldValues[field.name] ?? field.defaultValue ?? ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
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
              )}
            </div>
          ))}

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
                Processing...
              </span>
            ) : 'Convert File'}
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
            {result.message || 'File converted successfully!'}
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
              Download File
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
              Convert Another
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
