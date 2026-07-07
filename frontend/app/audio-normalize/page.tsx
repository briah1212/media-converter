'use client'

import Link from 'next/link'
import FileUploadConverter from '@/components/FileUploadConverter'

export default function AudioNormalize() {
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
        endpoint="audio/normalize"
        title="Audio Volume Normalization"
        description="Normalize audio volume to a target LUFS level"
        acceptedFormats=".mp3,.aac,.m4a,.wav,.ogg,.flac"
        additionalFields={[
          {
            name: 'target_lufs',
            label: 'Target LUFS (Loudness)',
            type: 'number',
            defaultValue: -16,
            placeholder: '-16',
            required: false,
          },
        ]}
      />
    </div>
  )
}
