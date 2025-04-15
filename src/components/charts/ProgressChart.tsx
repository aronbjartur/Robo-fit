"use client";
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,        
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

interface ChartJsData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
        tension: number;
        fill: boolean;
    }[];
}
interface ProgressChartProps {
  chartData: ChartJsData | null; 
}

const ProgressChart: React.FC<ProgressChartProps> = ({ chartData }) => {
  if (!chartData || !Array.isArray(chartData.labels) || !Array.isArray(chartData.datasets) || !chartData.datasets[0]?.data) {

    return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '50px' }}>No data to display chart.</div>;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: 'var(--text-primary)' }
      },
      title: { display: false }, 
      tooltip: {
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: { color: 'var(--text-secondary)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      x: {
         ticks: { color: 'var(--text-secondary)' },
         grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };
  return <Line options={options} data={chartData} />;
};

export default ProgressChart;