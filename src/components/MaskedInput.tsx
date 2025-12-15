import { useState, useEffect, useRef } from 'react'
import './MaskedInput.css'

export type MaskType = 'phone' | 'currency' | 'date' | 'time' | 'cpf'

interface MaskedInputProps {
  type: MaskType
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  name?: string
}

function MaskedInput({
  type,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  id,
  name,
}: MaskedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    setDisplayValue(formatValue(value))
  }, [value])

  const formatValue = (val: string): string => {
    if (!val) return ''

    switch (type) {
      case 'phone':
        return formatPhone(val)
      case 'currency':
        return formatCurrency(val)
      case 'date':
        return formatDate(val)
      case 'time':
        return formatTime(val)
      case 'cpf':
        return formatCPF(val)
      default:
        return val
    }
  }

  const formatPhone = (val: string): string => {
    const numbers = val.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
    }
  }

  const formatCurrency = (val: string): string => {
    const numbers = val.replace(/\D/g, '')
    const cents = numbers.slice(-2)
    const reais = numbers.slice(0, -2) || '0'
    const formattedReais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `R$ ${formattedReais},${cents.padStart(2, '0')}`
  }

  const formatDate = (val: string): string => {
    const numbers = val.replace(/\D/g, '')
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
    }
  }

  const formatTime = (val: string): string => {
    const numbers = val.replace(/\D/g, '')
    if (numbers.length <= 2) {
      return numbers
    } else {
      return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`
    }
  }

  const formatCPF = (val: string): string => {
    const numbers = val.replace(/\D/g, '')
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    } else {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
    }
  }

  const unformatValue = (val: string): string => {
    return val.replace(/\D/g, '')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const unformatted = unformatValue(inputValue)

    let maxLength = 0
    switch (type) {
      case 'phone':
        maxLength = 11
        break
      case 'currency':
        maxLength = 10
        break
      case 'date':
        maxLength = 8
        break
      case 'time':
        maxLength = 4
        break
      case 'cpf':
        maxLength = 11
        break
    }

    if (unformatted.length <= maxLength) {
      const formatted = formatValue(unformatted)
      setDisplayValue(formatted)
      onChange(unformatted)
    }
  }

  const getInputType = (): string => {
    switch (type) {
      case 'phone':
      case 'currency':
      case 'date':
      case 'time':
        return 'text'
      default:
        return 'text'
    }
  }

  const getPlaceholder = (): string => {
    if (placeholder) return placeholder

    switch (type) {
      case 'phone':
        return '(00) 00000-0000'
      case 'currency':
        return 'R$ 0,00'
      case 'date':
        return 'DD/MM/AAAA'
      case 'time':
        return 'HH:MM'
      case 'cpf':
        return '000.000.000-00'
      default:
        return ''
    }
  }

  return (
    <input
      ref={inputRef}
      type={getInputType()}
      id={id}
      name={name}
      className={`masked-input ${className}`}
      value={displayValue}
      onChange={handleChange}
      placeholder={getPlaceholder()}
      disabled={disabled}
    />
  )
}

export default MaskedInput

