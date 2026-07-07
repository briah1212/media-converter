'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VideoResize() {
  const [file, setFile] = useState<File | null>(null)
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const [maintainAspect, setMaintainAspect] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    if (width < 1 || width > 7680 || height < 1 || height > 4320) {
      setError('Width must be 1-7680 and height must be 1-4320')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('width', width.toString())
    formData.append('height', height.toString())
    formData.append('maintain_aspect', maintainAspect.toString())

    try {
      const response = await fetch(`${API_URL}/api/v1/video/resize`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Resize failed')
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
    if (result && result.file_id) {
      window.open(`${API_URL}/api/v1/download/${result.file_id}`, '_blank')
    }
  }

  const presetResolutions = [
    { name: '4K (3840x2160)', width: 3840, height: 2160 },
    { name: 'Full HD (1920x1080)', width: 1920, height: 1080 },
    { name: 'HD (1280x720)', width: 1280, height: 720 },
    { name: 'SD (640x480)', width: 640, height: 480 },
  ]

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
          Resize Video
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Change the resolution of your video
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Upload Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
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
            {file && (
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                color: '#666',
              }}>
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Preset Resolutions
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
            }}>
              {presetResolutions.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setWidth(preset.width)
                    setHeight(preset.height)
                  }}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Width (pixels)
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
              min="1"
              max="7680"
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
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Height (pixels)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
              min="1"
              max="4320"
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
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={maintainAspect}
                onChange={(e) => setMaintainAspect(e.target.checked)}
                style={{
                  marginRight: '0.5rem',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                }}
              />
              <span style={{
                fontWeight: '500',
                color: '#333',
              }}>
                Maintain aspect ratio
              </span>
            </label>
            <p style={{
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '0.25rem',
              marginLeft: '1.625rem',
            }}>
              When enabled, the video will be scaled proportionally
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: (loading || !file) ? '#9ca3af' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (loading || !file) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              if (!loading && file) e.currentTarget.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              if (!loading && file) e.currentTarget.style.backgroundColor = '#667eea'
            }}
          >
            {loading ? 'Resizing...' : 'Resize Video'}
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

        {result && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#16a34a',
            }}>
              Resize Complete!
            </h3>
            <div style={{
              marginBottom: '1rem',
              color: '#333',
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Original Resolution:</strong> {result.original_width}x{result.original_height}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>New Resolution:</strong> {result.new_width}x{result.new_height}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>File Size:</strong> {result.file_size ? (result.file_size / 1024 / 1024).toFixed(2) : 'N/A'} MB
              </p>
            </div>
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
              Download Resized Video
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
