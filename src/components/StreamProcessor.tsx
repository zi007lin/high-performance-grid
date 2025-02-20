import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Queue implementation for managing time-series data
class MessageQueue {
    private queue: any[];
    private windowSize: number;

    constructor(windowSize = 1000) { // 1 second in ms
        this.queue = [];
        this.windowSize = windowSize;
    }

    enqueue(message: number) {
        const now = Date.now();
        // Remove old messages outside the time window
        this.queue = this.queue.filter(m => (now - m.timestamp) <= this.windowSize);
        this.queue.push({ value: message, timestamp: now });
    }

    getAverageValue() {
        if (this.queue.length === 0) return 0;
        const sum = this.queue.reduce((acc, msg) => acc + msg.value, 0);
        return sum / this.queue.length;
    }

    getValues() {
        return this.queue.map(m => ({
            value: m.value,
            time: new Date(m.timestamp).toLocaleTimeString()
        }));
    }
}

interface Alert {
    id: number;
    type: string;
    value: string;
    timestamp: string;
}

interface ChartDataPoint {
    value: number;
    time: string;
}

const StreamProcessor = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const queueRef = useRef(new MessageQueue());
    const [average, setAverage] = useState(0);

    const LOWER_BOUND = 0;
    const UPPER_BOUND = 10000;

    // Simulate incoming binary messages
    useEffect(() => {
        const interval = setInterval(() => {
            // Simulate a binary message (random value for demonstration)
            const newValue = Math.random() * 15000;
            processMessage(newValue);
        }, 100); // Generate message every 100ms

        return () => clearInterval(interval);
    }, []);

    const processMessage = (value: number) => {
        queueRef.current.enqueue(value);
        const newAverage = queueRef.current.getAverageValue();
        setAverage(newAverage);

        // Check bounds and create alerts
        if (newAverage < LOWER_BOUND) {
            createAlert('Low', newAverage);
        } else if (newAverage > UPPER_BOUND) {
            createAlert('High', newAverage);
        }

        // Update chart data
        setChartData(queueRef.current.getValues());
    };

    const createAlert = (type: string, value: number) => {
        const newAlert = {
            id: Date.now(),
            type,
            value: value.toFixed(2),
            timestamp: new Date().toLocaleTimeString()
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 5)); // Keep last 5 alerts
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Stream Processor</h2>
                <div className="text-lg">
                    Current Average: {average.toFixed(2)}
                </div>
            </div>

            <div className="h-64">
                <LineChart data={chartData} width={800} height={250}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 15000]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                </LineChart>
            </div>

            <div className="space-y-2">
                {alerts.map(alert => (
                    <div key={alert.id} style={{
                        padding: '12px',
                        marginBottom: '8px',
                        backgroundColor: alert.type === 'High' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                        border: `1px solid ${alert.type === 'High' ? '#dc3545' : '#ffc107'}`,
                        borderRadius: '4px',
                        color: '#ffffff'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                            {alert.type} Bound Alert
                        </div>
                        <div>
                            Value: {alert.value} at {alert.timestamp}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StreamProcessor;