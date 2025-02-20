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

const gridUpdateEmitter = {
  listeners: [] as ((count: number) => void)[],
  emit(count: number) {
    console.log('[DEBUG] Emitting Update Count:', count);  // Debug log
    this.listeners.forEach(listener => listener(count));
  },
  subscribe(listener: (count: number) => void) {
    this.listeners.push(listener);
    console.log('[DEBUG] Subscribed to Updates');  // Debug log
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
      console.log('[DEBUG] Unsubscribed from Updates');  // Debug log
    };
  }
};

// Register globally once
if (!(window as any).gridUpdateEmitter) {
  (window as any).gridUpdateEmitter = gridUpdateEmitter;
}

const App: React.FC = () => {
  const dataModelRef = useRef(createDataModel(10));
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const lastUpdateTimeRef = useRef<number>(performance.now());
  const updateCountRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = gridUpdateEmitter.subscribe((count) => {
      if (!isPaused) {
        updateCountRef.current += count;
        console.log('[DEBUG] Received Update Count:', updateCountRef.current);  // Debug log
      }
    });

    const monitor = () => {
      const now = performance.now();
      const elapsed = now - lastUpdateTimeRef.current;
      const rate = updateCountRef.current / (elapsed / 1000);

      console.log('[DEBUG] Calculated Rate:', rate);  // Debug log

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
        createAlert('No Updates', 'Update gap detected');
      } else if (rate > 1000) {
        createAlert('High Rate', `Update rate exceeded: ${rate.toFixed(0)} updates/s`);
      } else {
        // Clear previous alerts if the rate is normal
        setAlerts(prev => prev.filter(alert => alert.type !== 'No Updates'));
      }

      updateCountRef.current = 0;
      lastUpdateTimeRef.current = now;

      // Fixed delay for monitoring
      setTimeout(monitor, 1000);
    };

    // Start monitoring
    monitor();

    return () => {
      unsubscribe();
    };
  }, [isPaused]);

  const createAlert = (type: string, message: string) => {
    const newAlert: AlertItem = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };

    setAlerts(prev => {
      const filteredAlerts = prev.filter(alert => alert.type !== type);
      return [newAlert, ...filteredAlerts].slice(0, 5);
    });
  };

  // Clear alerts when updates resume
  useEffect(() => {
    if (currentRate > 0 && !isPaused) {
      setAlerts(prev => prev.filter(alert => alert.type !== 'No Updates'));
    }
  }, [currentRate, isPaused]);

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
        <h3 style={{ color: '#ffffff', margin: 0 }}>Updates Per Second</h3>

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
            <span style={{ color: '#dc3545' }}>No Updates</span>
          ) : (
            `${Math.round(currentRate).toLocaleString()} updates/s`
          )}
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#fff" />
            <YAxis stroke="#fff" />
            <Tooltip />
            <Line type="monotone" dataKey="rate" stroke="#00a6ed" dot={false} name="Updates/s" />
          </LineChart>
        </ResponsiveContainer>

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
