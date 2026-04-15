import { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/SearchableSelect.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface SearchableSelectGroup {
  label: string;
  options: SearchableSelectOption[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  groups: SearchableSelectGroup[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  groups,
  placeholder = 'בחר...',
  required,
  disabled,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find selected option label
  const selectedOption = groups
    .flatMap((g) => g.options)
    .find((o) => o.value === value);

  // Filter options based on search
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      options: group.options.filter(
        (opt) =>
          opt.label.includes(search) ||
          opt.sublabel?.includes(search) ||
          group.label.includes(search)
      ),
    }))
    .filter((group) => group.options.length > 0);

  // Flat list of visible options for keyboard nav
  const flatOptions = filteredGroups.flatMap((g) => g.options);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('.ss-option');
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSearch('');
    setHighlightedIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const selectOption = useCallback(
    (optValue: string) => {
      onChange(optValue);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < flatOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : flatOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatOptions[highlightedIndex]) {
          selectOption(flatOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  return (
    <div className="ss-container" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger button - shows selected value or placeholder */}
      {!isOpen && (
        <button
          type="button"
          className={`ss-trigger ${value ? 'ss-trigger--has-value' : ''} ${disabled ? 'ss-trigger--disabled' : ''}`}
          onClick={disabled ? undefined : openDropdown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="ss-trigger-text">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.sublabel && (
            <span className="ss-trigger-sublabel">{selectedOption.sublabel}</span>
          )}
          <svg className="ss-chevron" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Search input + dropdown */}
      {isOpen && (
        <>
          <div className="ss-search-wrapper">
            <svg className="ss-search-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="ss-search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="חפש סעיף..."
              autoComplete="off"
            />
            {value && (
              <button
                type="button"
                className="ss-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  inputRef.current?.focus();
                }}
                title="נקה בחירה"
              >
                &times;
              </button>
            )}
          </div>

          <div className="ss-dropdown" ref={listRef} role="listbox">
            {filteredGroups.length === 0 ? (
              <div className="ss-empty">לא נמצאו תוצאות</div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.label} className="ss-group">
                  <div className="ss-group-label">{group.label}</div>
                  {group.options.map((option) => {
                    const flatIndex = flatOptions.indexOf(option);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === value}
                        className={`ss-option ${
                          option.value === value ? 'ss-option--selected' : ''
                        } ${flatIndex === highlightedIndex ? 'ss-option--highlighted' : ''}`}
                        onClick={() => selectOption(option.value)}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                      >
                        <span className="ss-option-label">{option.label}</span>
                        {option.sublabel && (
                          <span className="ss-option-sublabel">{option.sublabel}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Hidden input for form required validation */}
      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          className="ss-hidden-input"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
