/**
 * API Utility Functions for Media Converter
 * Centralized utilities for API calls, file handling, and formatting
 */

/**
 * Get API base URL from environment or use default
 * @returns API base URL
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

/**
 * Generic API call with FormData for file uploads
 * @param endpoint - API endpoint path (without /api/v1/ prefix)
 * @param formData - FormData object containing file and parameters
 * @returns JSON response from API
 * @throws Error if upload fails
 */
export async function uploadFile(
  endpoint: string,
  formData: FormData
): Promise<any> {
  const response = await fetch(`${getApiUrl()}/api/v1/${endpoint}`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Upload failed')
  }

  return response.json()
}

/**
 * Download file helper - opens file in new tab
 * @param fileId - ID of the file to download
 */
export function downloadFile(fileId: string): void {
  window.open(`${getApiUrl()}/api/v1/download/${fileId}`, '_blank')
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (B, KB, or MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  else return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * Format time duration in MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted string (MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Validate time format (HH:MM:SS)
 * @param time - Time string to validate
 * @returns true if valid HH:MM:SS format, false otherwise
 */
export function validateTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
  return regex.test(time)
}
