'use client'

interface ConversionResultProps {
  result: {
    file_id?: string
    message?: string
    metadata?: Record<string, any>
    title?: string
    format?: string
    [key: string]: any
  }
  onReset: () => void
}

export default function ConversionResult({ result, onReset }: ConversionResultProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handleDownload = () => {
    if (result.file_id) {
      window.open(`${API_URL}/api/v1/download/${result.file_id}`, '_blank')
    }
  }

  const formatMetadataKey = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatMetadataValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'number') {
      // Check if it's a percentage or ratio
      if (value < 1 && value > 0) {
        return `${(value * 100).toFixed(2)}%`
      }
      return value.toLocaleString()
    }
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  // Extract metadata excluding common fields
  const displayMetadata = result.metadata 
    ? Object.entries(result.metadata).filter(([key]) => 
        !['file_id', 'message', 'title'].includes(key)
      )
    : []

  // Also check for top-level metadata fields
  const additionalFields = Object.entries(result).filter(([key, value]) => 
    !['file_id', 'message', 'title', 'format', 'metadata'].includes(key) &&
    value !== null &&
    value !== undefined
  )

  const allMetadata = [...displayMetadata, ...additionalFields]

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#f0fdf4',
      borderRadius: '8px',
      border: '2px solid #16a34a',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '0.75rem',
      }}>
        <span style={{
          fontSize: '2rem',
          marginRight: '0.75rem',
        }}>
          ✅
        </span>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#16a34a',
          margin: 0,
        }}>
          Conversion Successful!
        </h3>
      </div>

      {result.message && (
        <p style={{
          color: '#333',
          marginBottom: '1rem',
          fontSize: '0.95rem',
        }}>
          {result.message}
        </p>
      )}

      {result.title && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          borderLeft: '4px solid #16a34a',
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: '#666',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            fontWeight: '600',
          }}>
            Title
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#333',
            fontWeight: '500',
          }}>
            {result.title}
          </div>
        </div>
      )}

      {allMetadata.length > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}>
            Conversion Details
          </div>
          <div style={{
            display: 'grid',
            gap: '0.5rem',
          }}>
            {allMetadata.map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              >
                <span style={{
                  color: '#666',
                  fontWeight: '500',
                }}>
                  {formatMetadataKey(key)}:
                </span>
                <span style={{
                  color: '#333',
                  fontWeight: '600',
                  textAlign: 'right',
                  marginLeft: '1rem',
                }}>
                  {formatMetadataValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        {result.file_id && (
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              minWidth: '140px',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
          >
            <span>📥</span>
            Download File
          </button>
        )}
        <button
          onClick={onReset}
          style={{
            flex: 1,
            minWidth: '140px',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5568d3'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
        >
          <span>🔄</span>
          Convert Another
        </button>
      </div>
    </div>
  )
}
