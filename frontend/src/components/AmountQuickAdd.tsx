import { AMOUNT_QUICK_ADDS, addToAmount } from '../utils/quickEntry';
import '../styles/QuickEntry.css';

interface AmountQuickAddProps {
  value: string;
  onChange: (value: string) => void;
  increments?: number[];
}

/**
 * Quick-add buttons rendered under an amount field, so a value can be built up
 * by tapping (+10/+50/+100/...) instead of typing — handy on mobile.
 */
export default function AmountQuickAdd({
  value,
  onChange,
  increments = AMOUNT_QUICK_ADDS,
}: AmountQuickAddProps) {
  return (
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
      {value !== '' && (
        <button
          type="button"
          className="qe-amount-btn qe-amount-btn--clear"
          onClick={() => onChange('')}
        >
          נקה
        </button>
      )}
    </div>
  );
}
