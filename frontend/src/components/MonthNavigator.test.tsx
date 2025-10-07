import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MonthNavigator from './MonthNavigator';

describe('MonthNavigator', () => {
  it('displays current month and year in Hebrew', () => {
    const onChange = vi.fn();
    render(<MonthNavigator year={2025} month={1} onChange={onChange} />);
    
    expect(screen.getByText(/ינואר 2025/)).toBeInTheDocument();
  });

  it('navigates to previous month', () => {
    const onChange = vi.fn();
    render(<MonthNavigator year={2025} month={2} onChange={onChange} />);
    
    const prevButton = screen.getByLabelText('חודש קודם');
    fireEvent.click(prevButton);
    
    expect(onChange).toHaveBeenCalledWith(2025, 1);
  });

  it('navigates to next month', () => {
    const onChange = vi.fn();
    render(<MonthNavigator year={2025} month={1} onChange={onChange} />);
    
    const nextButton = screen.getByLabelText('חודש הבא');
    fireEvent.click(nextButton);
    
    expect(onChange).toHaveBeenCalledWith(2025, 2);
  });

  it('handles year boundary from January to December', () => {
    const onChange = vi.fn();
    render(<MonthNavigator year={2025} month={1} onChange={onChange} />);
    
    const prevButton = screen.getByLabelText('חודש קודם');
    fireEvent.click(prevButton);
    
    expect(onChange).toHaveBeenCalledWith(2024, 12);
  });

  it('handles year boundary from December to January', () => {
    const onChange = vi.fn();
    render(<MonthNavigator year={2024} month={12} onChange={onChange} />);
    
    const nextButton = screen.getByLabelText('חודש הבא');
    fireEvent.click(nextButton);
    
    expect(onChange).toHaveBeenCalledWith(2025, 1);
  });

  it('shows month picker when showMonthPicker is true', () => {
    const onChange = vi.fn();
    render(<MonthNavigator year={2025} month={1} onChange={onChange} showMonthPicker={true} />);
    
    const display = screen.getByText(/ינואר 2025/);
    fireEvent.click(display);
    
    // Check if all months are displayed
    expect(screen.getByText('פברואר')).toBeInTheDocument();
    expect(screen.getByText('מרץ')).toBeInTheDocument();
  });

  it('selects month from picker', () => {
    const onChange = vi.fn();
    render(<MonthNavigator year={2025} month={1} onChange={onChange} showMonthPicker={true} />);
    
    const display = screen.getByText(/ינואר 2025/);
    fireEvent.click(display);
    
    const marchButton = screen.getByText('מרץ');
    fireEvent.click(marchButton);
    
    expect(onChange).toHaveBeenCalledWith(2025, 3);
  });
});
