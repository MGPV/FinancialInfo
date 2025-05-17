import logo from './logo.svg';
import './App.css';
import React, { useState, useRef, useEffect } from 'react';
import { createChart } from 'lightweight-charts';
import { LineChart, ComposedChart, Customized, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Candlestick = ({ xAxisMap, yAxisMap, data, width, height, offset }) => {
  const xScale = xAxisMap[0].scale;
  const yScale = yAxisMap[0].scale;

  const xOffset = (offset && offset.left) || 0;
  const yOffset = (offset && offset.top) || 0;

  return (
    <g>
      {data.map((d, i) => {
        const x = xScale(d.datetime) + xOffset;
        const openY = yScale(d.open);
        const closeY = yScale(d.close);
        const highY = yScale(d.high);
        const lowY = yScale(d.low);

        const color = d.close > d.open ? '#4caf50' : '#f44336';
        const barWidth = 4;
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(openY - closeY));

        

        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x}
              x2={x}
              y1={highY}
              y2={lowY}
              stroke={color}
              strokeWidth={1}
            />
            {/* Body */}
            <rect
              x={x - barWidth / 2}
              y={bodyY}
              width={barWidth}
              height={bodyHeight}
              fill={color}
            />
          </g>
        );
      })}
    </g>
  );
};

function App() {
  const [symbol, setSymbol] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState([]);

  const chartContainerRef = useRef();

  useEffect(() => {
    if (chartData.length == 0) return;
    const chart = createChart(chartContainerRef.current, {
      width: 600,
      height: 300,
      layout: {
        background: { color: '#fff' },
        textColor: '#000',
      },
      grid: {
        vertLines: { color: '#eee' },
        horLines: { color: '#eee' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries();
    const emaSeries = chart.addLineSeries({
      color: '#82ca9d',
      lineWidth: 2,
      
    });
    const candleData = chartData.map(d => ({
      time: Math.floor(new Date(d.datetime).getTime() / 1000),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    const emaData = chartData.map(d => ({
      time: Math.floor(new Date(d.datetime).getTime() / 1000),
      value: d.EMA55,
    }));
    candleSeries.setData(candleData);
    emaSeries.setData(emaData);

    return () => chart.remove();
  }, [chartData]);

  const fetchRecommendation = async () => {
    if (!symbol) return;

    try {
      setResult(null);
      setError('');

      const response = await fetch(`http://localhost:5050/stock/${symbol}/ema-recommendation`);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        await fetchChartData();
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    
  }

  const fetchChartData = async () => {
    try {
      const response = await fetch(`http://localhost:5050/stock/${symbol}/history`);
      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError('Error fetching chart data');
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Arial', maxWidth: 600, margin: 'auto' }}>
      <h2>Custom Symbol EMA Insight</h2>
      <input
        type="text"
        placeholder="e.g. btc-usd"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        style={{ padding: 8, fontSize: 16, marginRight: 8 }}
      />
      <button onClick={fetchRecommendation} style={{ padding: '8px 16px', fontSize: 16 }}>
        Check
      </button>

      {error && <p style={{ color: 'red', marginTop: 20 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 20, padding: 15, border: '1px solid #ccc' }}>
          <p><strong>Symbol:</strong> {result.symbol}</p>
          <p><strong>Current Price:</strong> ${result.currentPrice}</p>
          <p><strong>EMA55:</strong> ${result.EMA55}</p>
          <p><strong>Difference %:</strong> {result.percentDifference}%</p>
          <p><strong>Recommendation:</strong> {result.recommendation}</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div style={{ marginTop: 40 }}>
      
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <h3>Price & EMA55 (7 days, 4 hour intervals)</h3>
        <div ref={chartContainerRef} id="tv-chart" style={{ height: 300 }}></div>
      </div>

    </div>
  );
}

export default App;
