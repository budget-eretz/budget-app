import { AMOUNT_QUICK_ADDS, addToAmount } from '../utils/quickEntry';
import '../styles/QuickEntry.css';

interface AmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  increments?: number[];
}

/**
 * Amount input tuned for quick entry: numeric keypad on mobile, an inline
 * "clear" brush icon, and quick-add buttons (+1/+5/+10/...) underneath.
 */
export default function AmountField({
  value,
  onChange,
  placeholder = '0.00',
  required,
  increments = AMOUNT_QUICK_ADDS,
}: AmountFieldProps) {
  return (
    <>
      <div className="qe-amount-input-wrap">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="qe-amount-input"
        />
        {value !== '' && (
          <button
            type="button"
            className="qe-amount-clear"
            onClick={() => onChange('')}
            title="נקה סכום"
            aria-label="נקה סכום"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 4.5 13 11" />
              <path d="m10.5 8.5 5 5" />
              <path d="M4.5 21c-.3-3 .8-5.2 3.7-6.2l3 3c-1 2.9-3.2 4-6.2 3.7H4.5z" />
            </svg>
          </button>
        )}
      </div>
      <div className="qe-amount-adds">
        {increments.map((inc) => (
          <button
            key={inc}
            type="button"
            className="qe-amount-btn"
            onClick={() => onChange(addToAmount(value, inc))}
          >
            +{inc}
          </button>
        ))}
      </div>
    </>
  );
}
