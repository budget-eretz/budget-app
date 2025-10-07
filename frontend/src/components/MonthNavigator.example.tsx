import React, { useState } from 'react';
import MonthNavigator from './MonthNavigator';

/**
 * Example usage of MonthNavigator component
 * 
 * This component provides month/year navigation with Hebrew month names
 * and optional month picker dropdown.
 */
export default function MonthNavigatorExample() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(1);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    console.log(`Selected: ${newMonth}/${newYear}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>MonthNavigator Examples</h2>

      <h3>Basic Navigation (no picker)</h3>
      <MonthNavigator
        year={year}
        month={month}
        onChange={handleMonthChange}
      />

      <h3>With Month Picker Dropdown</h3>
      <MonthNavigator
        year={year}
        month={month}
        onChange={handleMonthChange}
        showMonthPicker={true}
      />

      <div style={{ marginTop: '20px', padding: '16px', background: '#f7fafc', borderRadius: '8px' }}>
        <p><strong>Selected:</strong> {month}/{year}</p>
      </div>
    </div>
  );
}
