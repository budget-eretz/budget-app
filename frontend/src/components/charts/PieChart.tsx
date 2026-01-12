import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { exportChart } from './utils';
import { generateColorPalette, generateBorderColors } from '../../utils/chartColors';

// Fix Chart.js types
type ChartJSRef = ChartJS<'pie', number[], string>;

ChartJS.register(ArcElement, Tooltip, Legend);

export interface PieChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export interface PieChartProps {
  data: PieChartData;
  options?: Partial<ChartOptions<'pie'>>;
  height?: number;
  title?: string;
  showLegend?: boolean;
  showPercentages?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showExportButton?: boolean;
  exportFilename?: string;
}

export default function PieChart({ 
  data, 
  options = {}, 
  height = 400, 
  title, 
  showLegend = true,
  showPercentages = true,
  legendPosition = 'right',
  showExportButton = false,
  exportFilename = 'pie-chart'
}: PieChartProps) {
  const chartRef = useRef<ChartJSRef | null>(null);

  const handleExport = () => {
    exportChart(chartRef, { filename: exportFilename });
  };
  
  // Generate distinct colors based on the number of data points
  const backgroundColors = generateColorPalette(data.labels.length);
  const borderColors = generateBorderColors(backgroundColors);
  
  // Ensure colors are applied to datasets
  const processedData = {
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || backgroundColors,
      borderColor: dataset.borderColor || borderColors,
      borderWidth: dataset.borderWidth ?? 2,
    })),
  };

  const defaultOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        rtl: true,
        labels: {
          font: {
            family: 'Arial, sans-serif',
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
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
            const value = context.parsed;
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            const formattedValue = new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
            return `${context.label}: ${formattedValue} (${percentage}%)`;
          },
        },
      },
    },
  };

  const chartOptions: ChartOptions<'pie'> = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      legend: {
        ...defaultOptions.plugins?.legend,
        ...options.plugins?.legend,
        display: showLegend,
        position: legendPosition,
        labels: {
          ...defaultOptions.plugins?.legend?.labels,
          ...options.plugins?.legend?.labels,
          generateLabels: showPercentages ? function(chart) {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              const dataset = data.datasets[0];
              const total = dataset.data.reduce((sum: number, val: any) => {
                const numVal = typeof val === 'number' ? val : 0;
                return sum + numVal;
              }, 0);
              
              return data.labels.map((label, index) => {
                const value = dataset.data[index] as number;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                const formattedValue = new Intl.NumberFormat('he-IL', {
                  style: 'currency',
                  currency: 'ILS',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value);
                
                return {
                  text: `${label}: ${formattedValue} (${percentage}%)`,
                  fillStyle: (dataset.backgroundColor as string[])?.[index] || backgroundColors[index],
                  strokeStyle: (dataset.borderColor as string[])?.[index] || borderColors[index],
                  lineWidth: 1,
                  hidden: false,
                  index: index,
                  pointStyle: 'circle' as const,
                };
              });
            }
            return [];
          } : undefined,
        },
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
        <Pie ref={chartRef} data={processedData} options={chartOptions} />
      </div>
    </div>
  );
}