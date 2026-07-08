'use client'

import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

interface VideoTrimmerProps {
  videoFile: File
  onTrimChange: (start: number, end: number) => void
  onVideoLoaded?: () => void
}

export default function VideoTrimmer({ videoFile, onTrimChange, onVideoLoaded }: VideoTrimmerProps) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const regionsPluginRef = useRef<any>(null)
  
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [videoInfo, setVideoInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  useEffect(() => {
    const initVideo = async () => {
      if (!videoFile || !videoRef.current) return

      setLoading(true)
      setError('')

      try {
        // Create object URL for video preview
        const videoUrl = URL.createObjectURL(videoFile)
        videoRef.current.src = videoUrl

        // Fetch video metadata from API
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const formData = new FormData()
        formData.append('file', videoFile)

        const infoResponse = await fetch(`${API_URL}/api/v1/video/info`, {
          method: 'POST',
          body: formData,
        })

        if (infoResponse.ok) {
          const info = await infoResponse.json()
          setVideoInfo(info)
          setDuration(info.duration || 0)
          setTrimEnd(info.duration || 0)
          if (onVideoLoaded) onVideoLoaded()
        }

        // Wait for video to load metadata
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              const videoDuration = videoRef.current?.duration || 0
              if (!videoInfo) {
                setDuration(videoDuration)
                setTrimEnd(videoDuration)
              }
              resolve()
            }
          }
        })

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading video:', err)
        setError('Failed to load video metadata')
        setLoading(false)
      }
    }

    initVideo()

    return () => {
      if (videoRef.current) {
        URL.revokeObjectURL(videoRef.current.src)
      }
    }
  }, [videoFile])

  useEffect(() => {
    if (!waveformRef.current || !videoRef.current || loading || duration === 0) return

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#667eea',
      progressColor: '#4f46e5',
      cursorColor: '#1e40af',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 100,
      normalize: true,
      backend: 'WebAudio',
      media: videoRef.current,
    })

    wavesurferRef.current = wavesurfer

    // Initialize Regions plugin
    const regions = wavesurfer.registerPlugin(RegionsPlugin.create())
    regionsPluginRef.current = regions

    wavesurfer.on('ready', () => {
      setIsReady(true)
      
      // Create initial trim region (full duration)
      const region = regions.addRegion({
        start: 0,
        end: duration,
        color: 'rgba(102, 126, 234, 0.3)',
        drag: true,
        resize: true,
      })

      // Update trim times when region changes
      region.on('update', () => {
        const start = region.start
        const end = region.end
        setTrimStart(start)
        setTrimEnd(end)
        onTrimChange(start, end)
      })

      region.on('update-end', () => {
        const start = region.start
        const end = region.end
        setTrimStart(start)
        setTrimEnd(end)
        onTrimChange(start, end)
      })
    })

    wavesurfer.on('timeupdate', (time: number) => {
      setCurrentTime(time)
    })

    wavesurfer.on('play', () => {
      setIsPlaying(true)
    })

    wavesurfer.on('pause', () => {
      setIsPlaying(false)
    })

    wavesurfer.on('finish', () => {
      setIsPlaying(false)
    })

    // Load audio from video
    wavesurfer.load(videoRef.current.src)

    return () => {
      wavesurfer.destroy()
    }
  }, [loading, duration, onTrimChange])

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  const seekToStart = () => {
    if (wavesurferRef.current && videoRef.current) {
      wavesurferRef.current.seekTo(trimStart / duration)
      videoRef.current.currentTime = trimStart
    }
  }

  const seekToEnd = () => {
    if (wavesurferRef.current && videoRef.current) {
      wavesurferRef.current.seekTo(trimEnd / duration)
      videoRef.current.currentTime = trimEnd
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isReady) {
        e.preventDefault()
        togglePlayPause()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isReady])

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fee2e2',
        borderRadius: '8px',
        color: '#dc2626',
        marginBottom: '1.5rem',
      }}>
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#666',
      }}>
        <div style={{
          fontSize: '1rem',
          marginBottom: '0.5rem',
        }}>
          Loading video...
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: '#999',
        }}>
          This may take a moment for large files
        </div>
      </div>
    )
  }

  return (
    <div style={{
      marginBottom: '1.5rem',
      padding: '1.5rem',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
    }}>
      {/* Video Info */}
      {videoInfo && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#e0e7ff',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#4338ca',
        }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span><strong>Duration:</strong> {formatTime(videoInfo.duration)}</span>
            <span><strong>Resolution:</strong> {videoInfo.width}x{videoInfo.height}</span>
            <span><strong>Format:</strong> {videoInfo.format?.toUpperCase()}</span>
            {videoInfo.file_size && (
              <span><strong>Size:</strong> {(videoInfo.file_size / 1024 / 1024).toFixed(2)} MB</span>
            )}
          </div>
        </div>
      )}

      {/* Video Preview */}
      <div style={{
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <video
          ref={videoRef}
          style={{
            maxWidth: '100%',
            maxHeight: '300px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
          controls
        />
      </div>

      {/* Waveform Timeline */}
      <div style={{
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{
          marginBottom: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#333',
        }}>
          Timeline - Drag handles to adjust trim range
        </div>
        <div ref={waveformRef} />
        {!isReady && (
          <div style={{
            padding: '1rem',
            textAlign: 'center',
            color: '#999',
            fontSize: '0.875rem',
          }}>
            Generating waveform...
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        justifyContent: 'center',
      }}>
        <button
          onClick={seekToStart}
          disabled={!isReady}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: isReady ? 'pointer' : 'not-allowed',
            opacity: isReady ? 1 : 0.5,
          }}
        >
          ⏮ Go to Start
        </button>
        <button
          onClick={togglePlayPause}
          disabled={!isReady}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: isReady ? 'pointer' : 'not-allowed',
            opacity: isReady ? 1 : 0.5,
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'} (Space)
        </button>
        <button
          onClick={seekToEnd}
          disabled={!isReady}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: isReady ? 'pointer' : 'not-allowed',
            opacity: isReady ? 1 : 0.5,
          }}
        >
          Go to End ⏭
        </button>
      </div>

      {/* Trim Info */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#e0f2fe',
        borderRadius: '6px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
            Current Time
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#0c4a6e' }}>
            {formatTime(currentTime)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
            Trim Start
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#0c4a6e' }}>
            {formatTime(trimStart)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
            Trim End
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#0c4a6e' }}>
            {formatTime(trimEnd)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
            Trim Duration
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#0c4a6e' }}>
            {formatTime(trimEnd - trimStart)}
          </div>
        </div>
      </div>
    </div>
  )
}
