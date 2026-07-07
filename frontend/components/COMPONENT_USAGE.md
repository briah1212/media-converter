# Reusable Component Usage Guide

## Components Created

### 1. FileUploadConverter.tsx
Generic single-file upload converter component.

**Features:**
- Single file selection with format validation
- File size display
- Dynamic additional form fields (text, number, select)
- Progress indicator during conversion
- Inline result display with metadata
- Download and reset functionality

**Props:**
```typescript
interface FileUploadConverterProps {
  endpoint: string              // API endpoint (e.g., "image/compress")
  title: string                 // Component title
  description: string           // Description text
  acceptedFormats: string       // File formats (e.g., ".jpg,.png,.gif")
  additionalFields?: AdditionalField[]  // Optional form fields
}

interface AdditionalField {
  name: string                  // Field name for API
  label: string                 // Display label
  type: 'text' | 'number' | 'select'
  options?: string[]            // For select fields
  placeholder?: string
  required?: boolean
  defaultValue?: string | number
}
```

**Example Usage:**
```tsx
import FileUploadConverter from '@/components/FileUploadConverter'

// Simple usage
<FileUploadConverter
  endpoint="image/compress"
  title="Image Compressor"
  description="Compress images while maintaining quality"
  acceptedFormats=".jpg,.jpeg,.png,.gif,.webp"
/>

// With additional fields
<FileUploadConverter
  endpoint="video/convert"
  title="Video Converter"
  description="Convert video to different formats"
  acceptedFormats=".mp4,.mov,.avi,.mkv"
  additionalFields={[
    {
      name: "format",
      label: "Output Format",
      type: "select",
      options: ["mp4", "webm", "avi"],
      required: true,
      defaultValue: "mp4"
    },
    {
      name: "quality",
      label: "Quality (1-100)",
      type: "number",
      placeholder: "80",
      defaultValue: 80
    }
  ]}
/>
```

---

### 2. MultiFileUploadConverter.tsx
Multi-file upload component for batch operations.

**Features:**
- Multiple file selection with drag-and-drop UI
- File list display with individual file sizes
- Remove individual files
- Total size calculation
- Min/max file limits
- Format validation
- Batch processing progress
- Result display with download

**Props:**
```typescript
interface MultiFileUploadConverterProps {
  endpoint: string              // API endpoint (e.g., "pdf/merge")
  title: string                 // Component title
  description: string           // Description text
  acceptedFormats: string       // File formats (e.g., ".pdf")
  minFiles?: number             // Minimum files required (default: 2)
  maxFiles?: number             // Maximum files allowed (default: 10)
}
```

**Example Usage:**
```tsx
import MultiFileUploadConverter from '@/components/MultiFileUploadConverter'

// PDF Merger
<MultiFileUploadConverter
  endpoint="pdf/merge"
  title="PDF Merger"
  description="Combine multiple PDF files into one"
  acceptedFormats=".pdf"
  minFiles={2}
  maxFiles={10}
/>

// Batch Image Compression
<MultiFileUploadConverter
  endpoint="image/batch-compress"
  title="Batch Image Compressor"
  description="Compress multiple images at once"
  acceptedFormats=".jpg,.jpeg,.png,.gif"
  minFiles={2}
  maxFiles={20}
/>
```

---

### 3. ConversionResult.tsx
Reusable success result display component.

**Features:**
- Success indicator with emoji
- Message display
- Title display (for YouTube downloads, etc.)
- Metadata display with automatic formatting
- Download button
- Reset/Convert Another button
- Automatic metadata key formatting (snake_case → Title Case)
- Smart value formatting (percentages, numbers, booleans)

**Props:**
```typescript
interface ConversionResultProps {
  result: {
    file_id?: string            // Required for download button
    message?: string            // Success message
    metadata?: Record<string, any>  // Additional metadata to display
    title?: string              // Optional title (e.g., video title)
    format?: string             // Output format
    [key: string]: any          // Any additional fields
  }
  onReset: () => void           // Callback for reset button
}
```

**Example Usage:**
```tsx
import ConversionResult from '@/components/ConversionResult'

// Inside your component
const [result, setResult] = useState<any>(null)

{result && (
  <ConversionResult
    result={result}
    onReset={() => {
      setResult(null)
      // Reset other state as needed
    }}
  />
)}

// Example result object
const exampleResult = {
  file_id: "abc123",
  message: "Image compressed successfully!",
  metadata: {
    original_size: "2.5 MB",
    compressed_size: "450 KB",
    compression_ratio: 0.82,
    dimensions: "1920x1080"
  }
}
```

---

## Styling

All components follow the project's purple theme:

- **Primary Color:** `#667eea`
- **Primary Hover:** `#5568d3`
- **Success Color:** `#16a34a`
- **Error Color:** `#dc2626`
- **Card:** White with 16px border radius, 2.5rem padding
- **Consistent shadows and transitions**

## API Integration

All components expect the API to follow this pattern:

**Request:**
```typescript
POST ${API_URL}/api/v1/${endpoint}
Content-Type: multipart/form-data

body: FormData {
  file: File (or "files" for multiple)
  ...additionalFields
}
```

**Response:**
```json
{
  "file_id": "unique-id",
  "message": "Success message",
  "metadata": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

**Error Response:**
```json
{
  "detail": "Error message"
}
```

## File Structure

```
frontend/components/
├── YouTubeConverter.tsx          (existing reference)
├── FileUploadConverter.tsx       (new - 372 lines)
├── MultiFileUploadConverter.tsx  (new - 435 lines)
├── ConversionResult.tsx          (new - 246 lines)
└── COMPONENT_USAGE.md            (this file)
```

## Next Steps

These components can be integrated into pages:

```typescript
// app/image-compress/page.tsx
import FileUploadConverter from '@/components/FileUploadConverter'

export default function ImageCompressPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <FileUploadConverter
        endpoint="image/compress"
        title="Image Compressor"
        description="Reduce image file size"
        acceptedFormats=".jpg,.jpeg,.png,.gif,.webp"
      />
    </div>
  )
}
```

