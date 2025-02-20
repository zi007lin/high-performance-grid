import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import HighPerformanceGrid from './components/HighPerformanceGrid';
import { createDataModel } from './components/GridDataModel';

interface ChartDataPoint {
  name: string;
  rate: number;
}

interface AlertItem {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

// Create an event emitter for grid updates
const gridUpdateEmitter = {
  listeners: [] as ((count: number) => void)[],
  emit(count: number) {
    this.listeners.forEach(listener => listener(count));
  },
  subscribe(listener: (count: number) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
};

const App: React.FC = () => {
  const dataModelRef = useRef(createDataModel(10));
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const lastUpdateTimeRef = useRef<number>(performance.now());
  const updateCountRef = useRef<number>(0);
  const gapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Subscribe to grid updates
    const unsubscribe = gridUpdateEmitter.subscribe((count) => {
      if (!isPaused) {
        updateCountRef.current = count;
      }
    });

    const monitorInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastUpdateTimeRef.current;
      const rate = (updateCountRef.current / elapsed) * 1000;

      setCurrentRate(rate);

      const newDataPoint = {
        name: new Date().toLocaleTimeString(),
        rate: isPaused ? 0 : rate
      };

      setChartData(prev => {
        const newData = [...prev.slice(-19), newDataPoint];
        return newData;
      });

      if (rate === 0 || isPaused) {
        createAlert('No Messages', 'Message gap detected');
      } else if (rate > 1000) {
        createAlert('High Rate', `Message rate exceeded: ${rate.toFixed(0)} msg/s`);
      }

      updateCountRef.current = 0;
      lastUpdateTimeRef.current = now;
    }, 1000);

    const createRandomGap = () => {
      const delay = Math.random() * 10000 + 5000;
      gapTimeoutRef.current = setTimeout(() => {
        setIsPaused(true);
        setTimeout(() => {
          setIsPaused(false);
          createRandomGap();
        }, 3000);
      }, delay);
    };

    createRandomGap();

    return () => {
      clearInterval(monitorInterval);
      if (gapTimeoutRef.current) {
        clearTimeout(gapTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [isPaused]);

  // Export the emitter for the grid to use
  (window as any).gridUpdateEmitter = gridUpdateEmitter;

  const createAlert = (type: string, message: string) => {
    const newAlert: AlertItem = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 3));
  };

  // Rest of the render code remains the same...
  return (
    <div style={{
      background: '#1a1b1e',
      minHeight: '100vh',
      display: 'flex',
      gap: '20px',
      padding: '20px'
    }}>
      <div style={{ flex: '2' }}>
        <HighPerformanceGrid dataModel={dataModelRef.current} />
      </div>

      <div style={{
        flex: '1',
        background: '#252629',
        padding: '20px',
        borderRadius: '8px',
        height: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h3 style={{ color: '#ffffff', margin: 0 }}>Messages per Second</h3>

        <div style={{
          backgroundColor: '#1a1b1e',
          padding: '15px',
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '24px',
          textAlign: 'center',
          transition: 'color 0.3s'
        }}>
          {isPaused ? (
            <span style={{ color: '#dc3545' }}>No Messages</span>
          ) : (
            `${Math.round(currentRate).toLocaleString()} msg/s`
          )}
        </div>

        <div style={{ flex: '1', minHeight: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="name"
                stroke="#fff"
                tick={{ fill: '#fff' }}
                tickFormatter={(value) => value.split(':')[2]}
              />
              <YAxis
                stroke="#fff"
                tick={{ fill: '#fff' }}
                domain={[0, 8000]}  // Adjusted to match grid updates
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1b1e',
                  border: '1px solid #333',
                  color: '#fff'
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#00a6ed"
                dot={false}
                name="Messages/s"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 style={{ color: '#ffffff', marginBottom: '10px' }}>Alerts</h4>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: alert.type === 'High Rate' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                border: `1px solid ${alert.type === 'High Rate' ? '#dc3545' : '#ffc107'}`,
                borderRadius: '4px',
                color: '#ffffff'
              }}>
                <div style={{ fontWeight: 'bold' }}>{alert.type}</div>
                <div>{alert.message} at {alert.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;