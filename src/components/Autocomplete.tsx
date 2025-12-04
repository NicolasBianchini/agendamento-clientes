import { useState, useEffect, useRef } from 'react'
import './Autocomplete.css'

interface Option {
  id: string
  label: string
  value?: string
}

interface AutocompleteProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  onSelect?: (option: Option) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  name?: string
  label?: string
  required?: boolean
  error?: string
}

function Autocomplete({
  options,
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar...',
  className = '',
  disabled = false,
  id,
  name,
  label,
  required = false,
  error,
}: AutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedOption, setSelectedOption] = useState<Option | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const option = options.find(opt => opt.id === value || opt.value === value)
    if (option) {
      setSelectedOption(option)
      setSearchTerm(option.label)
    } else {
      setSelectedOption(null)
      if (!value) {
        setSearchTerm('')
      }
    }
  }, [value, options])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    setShowDropdown(true)
    setSelectedOption(null)
    
    if (!newValue) {
      onChange('')
      onSelect?.(undefined as any)
    }
  }

  const handleSelectOption = (option: Option) => {
    setSelectedOption(option)
    setSearchTerm(option.label)
    setShowDropdown(false)
    onChange(option.id)
    onSelect?.(option)
  }

  const handleInputFocus = () => {
    setShowDropdown(true)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowDropdown(false)
    } else if (e.key === 'Enter' && filteredOptions.length > 0) {
      handleSelectOption(filteredOptions[0])
    }
  }

  return (
    <div className={`autocomplete-wrapper ${className}`} ref={wrapperRef}>
      {label && (
        <label htmlFor={id} className="autocomplete-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <div className="autocomplete-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          className={`autocomplete-input ${error ? 'input-error' : ''}`}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {showDropdown && filteredOptions.length > 0 && (
          <div className="autocomplete-dropdown">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`autocomplete-option ${selectedOption?.id === option.id ? 'selected' : ''}`}
                onClick={() => handleSelectOption(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  )
}

export default Autocomplete

