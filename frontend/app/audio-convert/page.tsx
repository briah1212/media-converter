'use client'

import Link from 'next/link'
import FileUploadConverter from '@/components/FileUploadConverter'

export default function AudioConvert() {
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
        endpoint="audio/convert"
        title="Audio Format Conversion"
        description="Convert your audio files between different formats"
        acceptedFormats=".mp3,.aac,.m4a,.wav,.ogg,.flac"
        additionalFields={[
          {
            name: 'output_format',
            label: 'Output Format',
            type: 'select',
            options: ['mp3', 'aac', 'm4a', 'wav', 'ogg'],
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
