import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { exportChart } from './utils';
import { generateColorPalette, generateBorderColors } from '../../utils/chartColors';

// Fix Chart.js types
type ChartJSRef = ChartJS<'bar', number[], string>;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface BarChartProps {
  data: BarChartData;
  options?: Partial<ChartOptions<'bar'>>;
  height?: number;
  title?: string;
  showLegend?: boolean;
  horizontal?: boolean;
  showExportButton?: boolean;
  exportFilename?: string;
}

const defaultOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      rtl: true,
      labels: {
        font: {
          family: 'Arial, sans-serif',
        },
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      rtl: true,
      titleFont: {
        family: 'Arial, sans-serif',
      },
      bodyFont: {
        family: 'Arial, sans-serif',
      },
      callbacks: {
        label: function(context) {
          const value = context.parsed.y || context.parsed.x;
          if (typeof value === 'number') {
            return `${context.dataset.label}: ${new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)}`;
          }
          return `${context.dataset.label}: -`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        font: {
          family: 'Arial, sans-serif',
        },
      },
    },
    y: {
      ticks: {
        font: {
          family: 'Arial, sans-serif',
        },
        callback: function(value, index) {
          if (typeof value === 'number') {
            return new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          }
          return '';
        },
      },
    },
  },
};

export default function BarChart({ 
  data, 
  options = {}, 
  height = 400, 
  title, 
  showLegend = true,
  horizontal = false,
  showExportButton = false,
  exportFilename = 'bar-chart'
}: BarChartProps) {
  const chartRef = useRef<ChartJSRef | null>(null);

  const handleExport = () => {
    exportChart(chartRef, { filename: exportFilename });
  };
  
  // Generate distinct colors for datasets
  const backgroundColors = generateColorPalette(Math.max(data.datasets.length, data.labels.length));
  const borderColors = generateBorderColors(backgroundColors);
  
  // Process data to ensure proper colors
  const processedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || 
        (data.datasets.length === 1 ? backgroundColors.slice(0, data.labels.length) : backgroundColors[index]),
      borderColor: dataset.borderColor || 
        (data.datasets.length === 1 ? borderColors.slice(0, data.labels.length) : borderColors[index]),
      borderWidth: dataset.borderWidth ?? 2,
    })),
  };
  
  const chartOptions: ChartOptions<'bar'> = {
    ...defaultOptions,
    ...options,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      legend: {
        ...defaultOptions.plugins?.legend,
        ...options.plugins?.legend,
        display: showLegend,
      },
      title: {
        ...defaultOptions.plugins?.title,
        ...options.plugins?.title,
        display: !!title,
        text: title,
        font: {
          family: 'Arial, sans-serif',
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  // Adjust scales for horizontal charts
  if (horizontal) {
    chartOptions.scales = {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales?.x,
        ticks: {
          ...chartOptions.scales?.x?.ticks,
          callback: function(value) {
            if (typeof value === 'number') {
              return new Intl.NumberFormat('he-IL', {
                style: 'currency',
                currency: 'ILS',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value);
            }
            return '';
          },
        },
      },
      y: {
        ...chartOptions.scales?.y,
        ticks: {
          ...chartOptions.scales?.y?.ticks,
          callback: function(value, index) {
            return data.labels[index] || value;
          },
        },
      },
    };
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {showExportButton && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ייצא תרשים
          </button>
        </div>
      )}
      <div style={{ height: `${height}px` }}>
        <Bar ref={chartRef} data={processedData} options={chartOptions} />
      </div>
    </div>
  );
}