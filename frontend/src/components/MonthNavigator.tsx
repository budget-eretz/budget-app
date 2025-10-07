import React, { useState } from 'react';

interface MonthNavigatorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  showMonthPicker?: boolean;
}

const HEBREW_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export default function MonthNavigator({
  year,
  month,
  onChange,
  showMonthPicker = false,
}: MonthNavigatorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handlePrevious = () => {
    if (month === 1) {
      // January -> December of previous year
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      // December -> January of next year
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  const handleMonthSelect = (selectedMonth: number) => {
    onChange(year, selectedMonth);
    setIsPickerOpen(false);
  };

  const handleYearChange = (newYear: number) => {
    onChange(newYear, month);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    marginBottom: '20px',
  };

  const buttonStyle: React.CSSProperties = {
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    minWidth: '40px',
    minHeight: '40px',
    transition: 'all 0.2s',
  };

  const displayStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    minWidth: '180px',
    textAlign: 'center',
    cursor: showMonthPicker ? 'pointer' : 'default',
    padding: '8px 16px',
    borderRadius: '6px',
    background: showMonthPicker ? 'white' : 'transparent',
    border: showMonthPicker ? '1px solid #e2e8f0' : 'none',
    position: 'relative',
  };

  const pickerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '16px',
    zIndex: 1000,
    minWidth: '280px',
  };

  const pickerGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '12px',
  };

  const monthButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    background: '#f7fafc',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  };

  const selectedMonthButtonStyle: React.CSSProperties = {
    ...monthButtonStyle,
    background: '#667eea',
    color: 'white',
    fontWeight: '600',
  };

  const yearControlStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0',
  };

  const yearButtonStyle: React.CSSProperties = {
    background: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  };

  const yearDisplayStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    minWidth: '60px',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <button
        style={buttonStyle}
        onClick={handlePrevious}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#5568d3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#667eea';
        }}
        aria-label="חודש קודם"
      >
        ←
      </button>

      <div style={{ position: 'relative' }}>
        <div
          style={displayStyle}
          onClick={() => showMonthPicker && setIsPickerOpen(!isPickerOpen)}
        >
          {HEBREW_MONTHS[month - 1]} {year}
        </div>

        {showMonthPicker && isPickerOpen && (
          <div style={pickerStyle}>
            <div style={yearControlStyle}>
              <button
                style={yearButtonStyle}
                onClick={() => handleYearChange(year - 1)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#cbd5e0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                }}
              >
                ←
              </button>
              <div style={yearDisplayStyle}>{year}</div>
              <button
                style={yearButtonStyle}
                onClick={() => handleYearChange(year + 1)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#cbd5e0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                }}
              >
                →
              </button>
            </div>

            <div style={pickerGridStyle}>
              {HEBREW_MONTHS.map((monthName, index) => {
                const monthNumber = index + 1;
                const isSelected = monthNumber === month;
                return (
                  <button
                    key={monthNumber}
                    style={isSelected ? selectedMonthButtonStyle : monthButtonStyle}
                    onClick={() => handleMonthSelect(monthNumber)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#e2e8f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f7fafc';
                      }
                    }}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <button
        style={buttonStyle}
        onClick={handleNext}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#5568d3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#667eea';
        }}
        aria-label="חודש הבא"
      >
        →
      </button>
    </div>
  );
}
