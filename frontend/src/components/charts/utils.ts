import { Chart } from 'chart.js';

export interface ExportOptions {
  filename?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
  backgroundColor?: string;
}

export const exportChart = (
  chartRef: React.RefObject<Chart>,
  options: ExportOptions = {}
): void => {
  if (!chartRef.current) {
    console.error('Chart reference is not available');
    return;
  }

  const {
    filename = 'chart',
    format = 'png',
    quality = 0.8,
    backgroundColor = 'white'
  } = options;

  try {
    const canvas = chartRef.current.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Canvas context is not available');
      return;
    }

    // Create a new canvas with white background
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (!exportCtx) {
      console.error('Export canvas context is not available');
      return;
    }

    // Fill with background color
    exportCtx.fillStyle = backgroundColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    // Draw the chart on top
    exportCtx.drawImage(canvas, 0, 0);

    // Convert to blob and download
    exportCanvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, `image/${format}`, quality);
  } catch (error) {
    console.error('Failed to export chart:', error);
  }
};

export const exportTableAsCSV = (
  data: any[],
  columns: { key: string; title: string }[],
  filename: string = 'table-data'
): void => {
  try {
    // Create CSV header
    const headers = columns.map(col => col.title).join(',');
    
    // Create CSV rows
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    );
    
    // Combine header and rows
    const csvContent = [headers, ...rows].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export table as CSV:', error);
  }
};