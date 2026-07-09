import Link from 'next/link'
import Header from '@/components/ui/Header'

interface Tool {
  title: string
  desc: string
  emoji: string
  href: string
}

interface Category {
  index: string
  name: string
  desc: string
  alt: boolean
  tools: Tool[]
}

const categories: Category[] = [
  {
    index: '01',
    name: 'YouTube Tools',
    desc: 'Download and convert YouTube videos',
    alt: false,
    tools: [
      { title: 'YouTube to MP4', desc: 'Download YouTube videos as MP4 files', emoji: '🎥', href: '/youtube-to-mp4' },
      { title: 'YouTube to MP3', desc: 'Download YouTube videos as MP3 audio', emoji: '🎵', href: '/youtube-to-mp3' },
    ],
  },
  {
    index: '02',
    name: 'Image Tools',
    desc: 'Compress, convert, and manipulate images',
    alt: true,
    tools: [
      { title: 'Image Compress', desc: 'Compress images while maintaining quality', emoji: '📦', href: '/image-compress' },
      { title: 'Image Convert', desc: 'Convert images between different formats', emoji: '🔄', href: '/image-convert' },
      { title: 'Target Size Compress', desc: 'Compress images to a specific target size', emoji: '🎯', href: '/image-compress-target' },
      { title: 'HEIC to JPG', desc: 'Convert HEIC images to JPG format', emoji: '📸', href: '/heic-to-jpg' },
      { title: 'Convert to HEIC', desc: 'Convert images to HEIC format', emoji: '📷', href: '/convert-to-heic' },
      { title: 'Convert to AVIF', desc: 'Convert images to modern AVIF format', emoji: '🖼️', href: '/convert-to-avif' },
      { title: 'Image Detect', desc: 'Detect objects and content in images', emoji: '🔍', href: '/image-detect' },
      { title: 'Batch Compress', desc: 'Compress multiple images at once', emoji: '📦', href: '/image-batch-compress' },
      { title: 'Image Resize', desc: 'Resize images to custom dimensions', emoji: '📐', href: '/image-resize' },
    ],
  },
  {
    index: '03',
    name: 'Audio Tools',
    desc: 'Convert, normalize, and edit audio files',
    alt: false,
    tools: [
      { title: 'MP4 to MP3', desc: 'Convert MP4 video files to MP3 audio', emoji: '🔄', href: '/mp4-to-mp3' },
      { title: 'Audio Convert', desc: 'Convert audio between different formats', emoji: '🎧', href: '/audio-convert' },
      { title: 'Audio Normalize', desc: 'Normalize audio volume levels', emoji: '🔊', href: '/audio-normalize' },
      { title: 'Extract Audio', desc: 'Extract audio from video files', emoji: '🎤', href: '/audio-extract' },
      { title: 'Trim Audio', desc: 'Trim and cut audio files', emoji: '✂️', href: '/audio-trim' },
    ],
  },
  {
    index: '04',
    name: 'Video Tools',
    desc: 'Compress, convert, and edit video files',
    alt: true,
    tools: [
      { title: 'Video Compress', desc: 'Compress videos to reduce file size', emoji: '📦', href: '/video-compress' },
      { title: 'Video Trim', desc: 'Trim and cut video files', emoji: '✂️', href: '/video-trim' },
      { title: 'Video Resize', desc: 'Resize videos to different resolutions', emoji: '📐', href: '/video-resize' },
      { title: 'Video Convert', desc: 'Convert videos between different formats', emoji: '🔄', href: '/video-convert' },
      { title: 'Compression Estimate', desc: 'Estimate video compression results', emoji: '📊', href: '/video-compress-estimate' },
    ],
  },
  {
    index: '05',
    name: 'PDF Tools',
    desc: 'Merge, split, and convert PDF documents',
    alt: false,
    tools: [
      { title: 'Merge PDFs', desc: 'Combine multiple PDFs into one', emoji: '🔗', href: '/pdf-merge' },
      { title: 'Split PDF', desc: 'Split PDF into separate pages', emoji: '✂️', href: '/pdf-split' },
      { title: 'Compress PDF', desc: 'Reduce PDF file size', emoji: '📦', href: '/pdf-compress' },
      { title: 'Images to PDF', desc: 'Convert images to PDF document', emoji: '📸', href: '/pdf-from-images' },
      { title: 'PDF to Images', desc: 'Extract images from PDF pages', emoji: '🖼️', href: '/pdf-to-images' },
    ],
  },
]

const toolCount = categories.reduce((n, c) => n + c.tools.length, 0)

export default function Home() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />

      <section
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '72px 32px 56px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ display: 'inline-flex', gap: 6, marginBottom: 20 }}>
          <span style={{ width: 14, height: 14, background: 'var(--accent)' }} />
          <span style={{ width: 14, height: 14, background: 'var(--amber)' }} />
          <span style={{ width: 14, height: 14, background: 'var(--accent-soft)' }} />
        </div>
        <h1
          className="font-pixel"
          style={{ fontSize: 40, lineHeight: 1.35, margin: '0 0 16px', fontWeight: 400 }}
        >
          BRIAN HSU
          <br />
          MEDIA SUITE
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--muted)',
            maxWidth: 560,
            margin: '0 auto 8px',
            lineHeight: 1.5,
          }}
        >
          Complete media conversion &amp; processing suite - download, convert, compress, and
          edit, all in one place.
        </p>
        <p style={{ fontSize: 13, color: 'var(--faint)', margin: '20px 0 0' }}>
          {toolCount} tools · {categories.length} categories · no sign-up required
        </p>
      </section>

      {categories.map((cat) => (
        <section
          key={cat.index}
          style={{
            background: cat.alt ? 'var(--bg-alt)' : 'var(--bg)',
            borderTop: '2px solid var(--border)',
            borderBottom: '2px solid var(--border)',
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
              <span className="font-pixel" style={{ fontSize: 28, color: 'var(--category-num)' }}>
                {cat.index}
              </span>
              <h2 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>{cat.name}</h2>
            </div>
            <p
              style={{
                fontSize: 14,
                color: 'var(--muted)',
                margin: '0 0 24px',
                paddingBottom: 20,
                borderBottom: '2px dashed var(--border)',
              }}
            >
              {cat.desc}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 16,
              }}
            >
              {cat.tools.map((tool) => (
                <Link key={tool.href} href={tool.href} className="tool-card notch-6">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div className="icon-tile notch-4" style={{ width: 42, height: 42, fontSize: 20 }}>
                      {tool.emoji}
                    </div>
                    <span
                      className="font-pixel"
                      style={{
                        fontSize: 8,
                        color: 'var(--accent-dark)',
                        background: 'var(--tile)',
                        padding: '3px 6px',
                      }}
                    >
                      TRY IT
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                      {tool.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                      {tool.desc}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      <footer
        style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 56px', textAlign: 'center' }}
      >
        <div className="font-pixel" style={{ fontSize: 11, color: 'var(--faint)' }}>
          BRIAN HSU MEDIA SUITE
        </div>
        <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>
          Built by Brian Hsu · files are processed securely and deleted after conversion
        </div>
      </footer>
    </div>
  )
}
