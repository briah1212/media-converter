'use client'

import Link from 'next/link'
import FileUploadConverter from '@/components/FileUploadConverter'

export default function AudioExtract() {
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

      <FileUploadConverter
        endpoint="audio/extract-from-video"
        title="Extract Audio from Video"
        description="Extract audio track from video files"
        acceptedFormats=".mp4,.avi,.mkv,.mov,.webm,.flv"
        additionalFields={[
          {
            name: 'format',
            label: 'Audio Format',
            type: 'select',
            options: ['mp3', 'aac', 'wav'],
            defaultValue: 'mp3',
            required: true,
          },
          {
            name: 'bitrate',
            label: 'Bitrate',
            type: 'select',
            options: ['128k', '192k', '256k', '320k'],
            defaultValue: '192k',
            required: false,
          },
        ]}
      />
    </div>
  )
}
