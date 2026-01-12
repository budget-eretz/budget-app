import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { exportChart } from './utils';
import { generateColorPalette, getColorsWithAlpha } from '../../utils/chartColors';

// Fix Chart.js types
type ChartJSRef = ChartJS<'line', number[], string>;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
  }[];
}

export interface LineChartProps {
  data: LineChartData;
  options?: Partial<ChartOptions<'line'>>;
  height?: number;
  title?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  smooth?: boolean;
  showExportButton?: boolean;
  exportFilename?: string;
}

const defaultOptions: ChartOptions<'line'> = {
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
          const value = context.parsed.y;
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
      grid: {
        display: true,
      },
      ticks: {
        font: {
          family: 'Arial, sans-serif',
        },
      },
    },
    y: {
      grid: {
        display: true,
      },
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
  interaction: {
    intersect: false,
    mode: 'index',
  },
};

export default function LineChart({ 
  data, 
  options = {}, 
  height = 400, 
  title, 
  showLegend = true,
  showGrid = true,
  smooth = true,
  showExportButton = false,
  exportFilename = 'line-chart'
}: LineChartProps) {
  const chartRef = useRef<ChartJSRef | null>(null);

  const handleExport = () => {
    exportChart(chartRef, { filename: exportFilename });
  };
  
  // Generate distinct colors for datasets
  const lineColors = generateColorPalette(data.datasets.length);
  const backgroundColors = getColorsWithAlpha(lineColors, 0.1);
  
  // Apply smooth curves to datasets if requested
  const processedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      tension: smooth ? (dataset.tension ?? 0.4) : 0,
      pointRadius: dataset.pointRadius ?? 4,
      pointHoverRadius: dataset.pointHoverRadius ?? 6,
      borderWidth: dataset.borderWidth ?? 3,
      borderColor: dataset.borderColor || lineColors[index],
      backgroundColor: dataset.backgroundColor || backgroundColors[index],
    })),
  };

  const chartOptions: ChartOptions<'line'> = {
    ...defaultOptions,
    ...options,
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
    scales: {
      x: {
        grid: {
          display: showGrid,
        },
        ticks: {
          font: {
            family: 'Arial, sans-serif',
          },
        },
      },
      y: {
        grid: {
          display: showGrid,
        },
        ticks: {
          font: {
            family: 'Arial, sans-serif',
          },
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
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

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
        <Line ref={chartRef} data={processedData} options={chartOptions} />
      </div>
    </div>
  );
}