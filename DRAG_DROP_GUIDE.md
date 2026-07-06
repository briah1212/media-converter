# Drag-and-Drop & Clipboard Paste Implementation Guide

## Overview

This guide explains how to implement drag-and-drop file upload and clipboard paste functionality for your media converter frontend.

## 1. Drag-and-Drop File Upload

### Basic Implementation (React/Next.js)

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone' // npm install react-dropzone

export default function FileUploader() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles)
    // Process files here
    acceptedFiles.forEach(file => {
      console.log(file.name, file.type, file.size)
    })
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.mkv']
    },
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
  })

  return (
    <div
      {...getRootProps()}
      style={{
        border: isDragging ? '3px dashed #667eea' : '2px dashed #ccc',
        borderRadius: '12px',
        padding: '3rem',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging ? '#f0f4ff' : 'white',
        transition: 'all 0.3s ease',
      }}
    >
      <input {...getInputProps()} />
      {isDragging ? (
        <p>Drop files here...</p>
      ) : (
        <div>
          <p>Drag & drop files here, or click to select</p>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            Supports: Images (PNG, JPG, WebP), Videos (MP4, AVI, MOV)
          </p>
        </div>
      )}
    </div>
  )
}
```

### Without External Libraries (Pure HTML5)

```typescript
'use client'

import { useState } from 'react'

export default function NativeDropZone() {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    
    // Filter for allowed file types
    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska'
    ]
    
    const validFiles = files.filter(file => 
      allowedTypes.some(type => file.type.startsWith(type.split('/')[0]))
    )

    console.log('Valid files:', validFiles)
    // Process files here
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: isDragging ? '3px dashed #667eea' : '2px dashed #ccc',
        borderRadius: '12px',
        padding: '3rem',
        textAlign: 'center',
        backgroundColor: isDragging ? '#f0f4ff' : 'white',
        transition: 'all 0.3s ease',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p>Drag & drop files here</p>
    </div>
  )
}
```

## 2. Clipboard Paste for Images

### Implementation

```typescript
'use client'

import { useState, useEffect } from 'react'

export default function ClipboardPaste() {
  const [pastedImage, setPastedImage] = useState<string | null>(null)

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        // Check if it's an image
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            // Create a preview
            const reader = new FileReader()
            reader.onload = (event) => {
              setPastedImage(event.target?.result as string)
            }
            reader.readAsDataURL(file)

            // Upload the file
            await uploadImage(file)
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const uploadImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', 'balanced')

    try {
      const response = await fetch('http://localhost:8000/api/v1/compress/image', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      console.log('Upload result:', result)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          border: '2px dashed #667eea',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          minHeight: '200px',
        }}
      >
        <p>Press Ctrl+V (or Cmd+V on Mac) to paste an image from clipboard</p>
        {pastedImage && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ color: 'green' }}>Image pasted successfully!</p>
            <img
              src={pastedImage}
              alt="Pasted"
              style={{ maxWidth: '300px', marginTop: '1rem' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

### Paste with Focus Detection

```typescript
export default function SmartPasteArea() {
  const [isFocused, setIsFocused] = useState(false)

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          console.log('Pasted image:', file)
          // Process the file
        }
      }
    }
  }

  return (
    <div
      onPaste={handlePaste}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      style={{
        border: isFocused ? '3px solid #667eea' : '2px dashed #ccc',
        borderRadius: '12px',
        padding: '2rem',
        outline: 'none',
        cursor: 'text',
      }}
    >
      <p>Click here and paste (Ctrl+V / Cmd+V)</p>
    </div>
  )
}
```

## 3. Combined Component (Drag, Drop, Click, Paste)

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'

export default function UniversalFileUploader() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const pastedFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) pastedFiles.push(file)
        }
      }

      if (pastedFiles.length > 0) {
        setFiles(prev => [...prev, ...pastedFiles])
        await uploadFiles(pastedFiles)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  // Handle drag and drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
    await uploadFiles(droppedFiles)
  }

  // Handle file input
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
    await uploadFiles(selectedFiles)
  }

  // Upload files to API
  const uploadFiles = async (filesToUpload: File[]) => {
    setUploadStatus('Uploading...')

    for (const file of filesToUpload) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', 'balanced')

      try {
        const endpoint = file.type.startsWith('image/')
          ? '/api/v1/compress/image'
          : '/api/v1/compress/video'

        const response = await fetch(`http://localhost:8000${endpoint}`, {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()
        console.log('Upload result:', result)
        setUploadStatus(`Compressed ${file.name} by ${result.compression_ratio}%`)
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadStatus('Upload failed')
      }
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '3px dashed #667eea' : '2px dashed #ccc',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragging ? '#f0f4ff' : 'white',
          transition: 'all 0.3s ease',
          minHeight: '250px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          📁
        </div>

        <h3 style={{ marginBottom: '0.5rem' }}>
          Drop files, click to browse, or paste (Ctrl+V)
        </h3>
        
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          Supports images and videos
        </p>

        {uploadStatus && (
          <p style={{ 
            marginTop: '1rem',
            color: uploadStatus.includes('failed') ? 'red' : 'green'
          }}>
            {uploadStatus}
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h4>Files ({files.length})</h4>
          <ul>
            {files.map((file, i) => (
              <li key={i}>
                {file.name} - {(file.size / 1024).toFixed(2)} KB
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

## 4. Best Practices

### File Validation

```typescript
const validateFile = (file: File) => {
  // Check file size (e.g., max 50MB)
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error(`File ${file.name} is too large (max 50MB)`)
  }

  // Check file type
  const allowedTypes = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/quicktime',
  ]
  
  if (!allowedTypes.some(type => file.type === type)) {
    throw new Error(`File type ${file.type} not supported`)
  }

  return true
}
```

### Progress Tracking

```typescript
const uploadWithProgress = async (file: File, onProgress: (percent: number) => void) => {
  const formData = new FormData()
  formData.append('file', file)

  const xhr = new XMLHttpRequest()

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100
      onProgress(percentComplete)
    }
  })

  return new Promise((resolve, reject) => {
    xhr.onload = () => resolve(JSON.parse(xhr.responseText))
    xhr.onerror = () => reject(new Error('Upload failed'))
    
    xhr.open('POST', 'http://localhost:8000/api/v1/compress/image')
    xhr.send(formData)
  })
}
```

### Multiple Files with Preview

```typescript
const FilePreviewList = ({ files }: { files: File[] }) => {
  const [previews, setPreviews] = useState<Record<string, string>>({})

  useEffect(() => {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviews(prev => ({
            ...prev,
            [file.name]: e.target?.result as string
          }))
        }
        reader.readAsDataURL(file)
      }
    })
  }, [files])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
      {files.map(file => (
        <div key={file.name} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '0.5rem' }}>
          {previews[file.name] && (
            <img src={previews[file.name]} alt={file.name} style={{ width: '100%', borderRadius: '4px' }} />
          )}
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{file.name}</p>
        </div>
      ))}
    </div>
  )
}
```

## 5. Mobile Considerations

```typescript
// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

// Mobile-friendly upload
const MobileUploader = () => {
  return (
    <div>
      {isMobile ? (
        <input
          type="file"
          accept="image/*,video/*"
          capture="environment" // Use camera
          multiple
          style={{
            padding: '1rem',
            fontSize: '1rem',
            width: '100%',
          }}
        />
      ) : (
        <div>{/* Drag and drop area */}</div>
      )}
    </div>
  )
}
```

## 6. Implementation Checklist

- [ ] Install dependencies (`react-dropzone` recommended)
- [ ] Create drop zone component
- [ ] Add paste event listener
- [ ] Implement file validation
- [ ] Add progress indicators
- [ ] Handle errors gracefully
- [ ] Test on mobile devices
- [ ] Add visual feedback (drag overlay)
- [ ] Support multiple files
- [ ] Add file previews
- [ ] Implement remove file functionality

## 7. Example Integration with Your API

```typescript
const compressImage = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('mode', 'balanced')
  formData.append('quality', '85')

  const response = await fetch('http://localhost:8000/api/v1/compress/image', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  
  // Download the compressed file
  const downloadUrl = `http://localhost:8000/api/v1/download/${result.file_id}`
  window.open(downloadUrl, '_blank')
  
  return result
}
```

This implementation provides a modern, user-friendly file upload experience similar to services like TinyPNG!
