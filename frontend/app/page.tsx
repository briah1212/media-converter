"use client"

import Link from 'next/link'

export default function Home() {
  const categories = [
    {
      name: 'YouTube Tools',
      icon: '🎥',
      description: 'Download and convert YouTube videos',
      tools: [
        {
          title: 'YouTube to MP4',
          description: 'Download YouTube videos as MP4 files',
          href: '/youtube-to-mp4',
          icon: '🎥',
        },
        {
          title: 'YouTube to MP3',
          description: 'Download YouTube videos as MP3 audio',
          href: '/youtube-to-mp3',
          icon: '🎵',
        },
      ],
    },
    {
      name: 'Image Tools',
      icon: '🖼️',
      description: 'Compress, convert, and manipulate images',
      tools: [
        {
          title: 'Image Compress',
          description: 'Compress images while maintaining quality',
          href: '/image-compress',
          icon: '🗜️',
        },
        {
          title: 'Image Convert',
          description: 'Convert images between different formats',
          href: '/image-convert',
          icon: '🔄',
        },
        {
          title: 'Target Size Compress',
          description: 'Compress images to a specific target size',
          href: '/image-compress-target',
          icon: '🎯',
        },
        {
          title: 'HEIC to JPG',
          description: 'Convert HEIC images to JPG format',
          href: '/heic-to-jpg',
          icon: '📸',
        },
        {
          title: 'Convert to HEIC',
          description: 'Convert images to HEIC format',
          href: '/convert-to-heic',
          icon: '📷',
        },
        {
          title: 'Convert to AVIF',
          description: 'Convert images to modern AVIF format',
          href: '/convert-to-avif',
          icon: '🖼️',
        },
        {
          title: 'Image Detect',
          description: 'Detect objects and content in images',
          href: '/image-detect',
          icon: '🔍',
        },
        {
          title: 'Batch Compress',
          description: 'Compress multiple images at once',
          href: '/image-batch-compress',
          icon: '📦',
        },
        {
          title: 'Image Resize',
          description: 'Resize images to custom dimensions',
          href: '/image-resize',
          icon: '📐',
        },
      ],
    },
    {
      name: 'Audio Tools',
      icon: '🎵',
      description: 'Convert, normalize, and edit audio files',
      tools: [
        {
          title: 'MP4 to MP3',
          description: 'Convert MP4 video files to MP3 audio',
          href: '/mp4-to-mp3',
          icon: '🔄',
        },
        {
          title: 'Audio Convert',
          description: 'Convert audio between different formats',
          href: '/audio-convert',
          icon: '🎧',
        },
        {
          title: 'Audio Normalize',
          description: 'Normalize audio volume levels',
          href: '/audio-normalize',
          icon: '🔊',
        },
        {
          title: 'Extract Audio',
          description: 'Extract audio from video files',
          href: '/audio-extract',
          icon: '🎤',
        },
        {
          title: 'Trim Audio',
          description: 'Trim and cut audio files',
          href: '/audio-trim',
          icon: '✂️',
        },
      ],
    },
    {
      name: 'Video Tools',
      icon: '🎬',
      description: 'Compress, convert, and edit video files',
      tools: [
        {
          title: 'Video Compress',
          description: 'Compress videos to reduce file size',
          href: '/video-compress',
          icon: '🗜️',
        },
        {
          title: 'Video Trim',
          description: 'Trim and cut video files',
          href: '/video-trim',
          icon: '✂️',
        },
        {
          title: 'Video Resize',
          description: 'Resize videos to different resolutions',
          href: '/video-resize',
          icon: '📐',
        },
        {
          title: 'Video Convert',
          description: 'Convert videos between different formats',
          href: '/video-convert',
          icon: '🔄',
        },
        {
          title: 'Compression Estimate',
          description: 'Estimate video compression results',
          href: '/video-compress-estimate',
          icon: '📊',
        },
      ],
    },
    {
      name: 'PDF Tools',
      icon: '📄',
      description: 'Merge, split, and convert PDF documents',
      tools: [
        {
          title: 'Merge PDFs',
          description: 'Combine multiple PDFs into one',
          href: '/pdf-merge',
          icon: '🔗',
        },
        {
          title: 'Split PDF',
          description: 'Split PDF into separate pages',
          href: '/pdf-split',
          icon: '✂️',
        },
        {
          title: 'Compress PDF',
          description: 'Reduce PDF file size',
          href: '/pdf-compress',
          icon: '🗜️',
        },
        {
          title: 'Images to PDF',
          description: 'Convert images to PDF document',
          href: '/pdf-from-images',
          icon: '📸',
        },
        {
          title: 'PDF to Images',
          description: 'Extract images from PDF pages',
          href: '/pdf-to-images',
          icon: '🖼️',
        },
      ],
    },
  ]

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 2rem',
      paddingBottom: '5rem',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '4rem',
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '1rem',
        }}>
          Brian Tools
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'rgba(255, 255, 255, 0.9)',
        }}>
          Complete Media Conversion & Processing Suite
        </p>
      </div>

      <div style={{
        maxWidth: '1400px',
        width: '100%',
      }}>
        {categories.map((category, idx) => (
          <div key={category.name} style={{
            marginBottom: idx < categories.length - 1 ? '4rem' : '0',
          }}>
            <div style={{
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
              }}>
                <span style={{ fontSize: '2.5rem' }}>{category.icon}</span>
                {category.name}
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.8)',
              }}>
                {category.description}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}>
              {category.tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  style={{
                    textDecoration: 'none',
                  }}
                >
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'pointer',
                    height: '100%',
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
                    }}
                  >
                    <div style={{
                      fontSize: '3rem',
                      marginBottom: '1rem',
                    }}>
                      {tool.icon}
                    </div>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      color: '#333',
                    }}>
                      {tool.title}
                    </h3>
                    <p style={{
                      color: '#666',
                      lineHeight: '1.5',
                    }}>
                      {tool.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
