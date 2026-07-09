'use client'

import { useRef, useState } from 'react'

interface VideoPreviewProps {
  src: string
  leftBadge: string
  rightBadge?: string
  maxHeight?: number
  accent?: boolean
  style?: React.CSSProperties
}

export default function VideoPreview({
  src,
  leftBadge,
  rightBadge,
  maxHeight = 300,
  accent,
  style,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  return (
    <div
      className="stripes-dark"
      onClick={togglePlay}
      style={{
        aspectRatio: '16/9',
        maxHeight,
        border: accent ? '2px solid oklch(58% 0.135 250 / 0.5)' : '2px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        ...style,
      }}
    >
      <video
        ref={videoRef}
        src={src}
        onEnded={() => setPlaying(false)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {!playing && (
        <div
          className="notch-6"
          style={{
            width: 56,
            height: 56,
            background: 'white',
            opacity: 0.9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            position: 'relative',
          }}
        >
          ▶
        </div>
      )}
      <span
        className="font-mono"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          fontSize: 11,
          background: 'black',
          color: 'white',
          padding: '3px 8px',
          opacity: 0.8,
          maxWidth: '60%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {leftBadge}
      </span>
      {rightBadge && (
        <span
          className="font-mono"
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            fontSize: 11,
            background: 'black',
            color: 'white',
            padding: '3px 8px',
            opacity: 0.8,
          }}
        >
          {rightBadge}
        </span>
      )}
    </div>
  )
}
