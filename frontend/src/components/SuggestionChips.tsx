import '../styles/QuickEntry.css';

export interface ChipItem {
  value: string;
  label: string;
}

interface SuggestionChipsProps {
  items: ChipItem[];
  onSelect: (value: string) => void;
  /** Optional currently-selected value, rendered as an active chip. */
  selectedValue?: string;
  /** Optional small label shown above the chips. */
  label?: string;
}

/**
 * A wrapping row of tappable suggestion chips. Used for "frequent funds" and
 * "frequent descriptions" quick-pick shortcuts.
 */
export default function SuggestionChips({
  items,
  onSelect,
  selectedValue,
  label,
}: SuggestionChipsProps) {
  if (items.length === 0) return null;

  return (
    <div>
      {label && <div className="qe-chips-label">{label}</div>}
      <div className="qe-chips">
        {items.map((item) => {
          const isActive = selectedValue !== undefined && item.value === selectedValue;
          return (
            <button
              key={item.value}
              type="button"
              className={`qe-chip ${isActive ? 'qe-chip--active' : ''}`}
              onClick={() => onSelect(item.value)}
              title={item.label}
            >
              <span className="qe-chip-text">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
