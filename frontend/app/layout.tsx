import type { Metadata } from 'next'
import { Silkscreen } from 'next/font/google'
import './globals.css'

const silkscreen = Silkscreen({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-pixel',
})

export const metadata: Metadata = {
  title: 'Brian Hsu Media Suite',
  description:
    'Complete media conversion & processing suite - download, convert, compress, and edit, all in one place.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={silkscreen.variable}>
      <body>{children}</body>
    </html>
  )
}
