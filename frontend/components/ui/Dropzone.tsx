'use client'

import { useRef, useState } from 'react'

interface DropzoneProps {
  emoji: string
  label: string
  hint: string
  accept?: string
  multiple?: boolean
  compact?: boolean
  onFiles: (files: File[]) => void
}

export default function Dropzone({
  emoji,
  label,
  hint,
  accept,
  multiple,
  compact,
  onFiles,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    onFiles(Array.from(list))
  }

  return (
    <div
      className={`dropzone${dragOver ? ' drag-over' : ''}`}
      style={{ marginTop: 28, ...(compact ? { padding: '32px 24px' } : {}) }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <div style={{ fontSize: compact ? 28 : 34 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: compact ? 14 : 15, marginTop: compact ? 8 : 12 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: compact ? 12 : 12.5,
          color: 'var(--muted)',
          marginTop: compact ? 4 : 6,
        }}
      >
        {hint}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
