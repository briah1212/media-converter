'use client'

interface ChipOption {
  value: string
  label: React.ReactNode
}

interface ChipsProps {
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
  style?: React.CSSProperties
}

export default function Chips({ options, value, onChange, style }: ChipsProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, ...style }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`chip${opt.value === value ? ' selected' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
