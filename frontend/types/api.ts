// Base response types
export interface BaseResponse {
  success: boolean
  message: string
  file_id?: string
}

export interface ConversionResult extends BaseResponse {
  title?: string
  duration?: number
}

export interface ImageCompressionResult extends BaseResponse {
  input_format: string
  output_format: string
  input_size_kb: number
  output_size_kb: number
  compression_ratio: number
  dimensions: { width: number; height: number }
}

export interface VideoCompressionResult extends BaseResponse {
  input_size_mb: number
  output_size_mb: number
  compression_ratio: number
  codec: string
  preset: string
}

export interface AudioResult extends BaseResponse {
  input_format?: string
  output_format?: string
  duration?: number
  bitrate?: string
}

export interface PDFResult extends BaseResponse {
  page_count?: number
  file_count?: number
}

export interface ImageDetectResult {
  format: string
  dimensions: { width: number; height: number }
  size_kb: number
  color_mode: string
  dpi?: number
}

export interface VideoEstimate {
  estimated_size_mb: number
  estimated_ratio: number
  estimated_time_seconds: number
}

// Component prop types
export interface FileUploaderProps {
  endpoint: string
  title: string
  description: string
  acceptedFormats: string
  additionalFields?: FormField[]
  onSuccess?: (result: any) => void
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox'
  defaultValue?: any
  options?: string[]
  placeholder?: string
}

// Error type
export interface APIError {
  detail: string
}
