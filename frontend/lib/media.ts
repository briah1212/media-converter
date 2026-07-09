/**
 * Client-side helpers to read media metadata from a File via HTMLMediaElement.
 */

export interface MediaMeta {
  duration: number
  width?: number
  height?: number
}

export function loadMediaMeta(file: File, kind: 'video' | 'audio'): Promise<MediaMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(kind)
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      const meta: MediaMeta = { duration: el.duration || 0 }
      if (kind === 'video') {
        const v = el as HTMLVideoElement
        meta.width = v.videoWidth
        meta.height = v.videoHeight
      }
      URL.revokeObjectURL(url)
      resolve(meta)
    }
    el.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read media metadata'))
    }
    el.src = url
  })
}
