// GridDataModel.ts
export interface RowData {
    id: number;
    agent: string;
    strategies: string;
    location: string;
    risk: number;
}

export class GridDataModel {
    private datasets: RowData[][];
    private currentIndex: number = 0;

    constructor(datasets: RowData[][]) {
        this.datasets = datasets;
    }

    dequeueData(): RowData[] {
        if (!this.datasets || this.datasets.length === 0) {
            console.warn('No datasets available');
            return [];
        }
        const currentData = this.datasets[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.datasets.length;
        return currentData;
    }
}

export const createDataModel = (numDatasets: number): GridDataModel => {
    const datasets: RowData[][] = [];
    
    for (let i = 0; i < numDatasets; i++) {
        const dataset: RowData[] = [];
        for (let j = 0; j < 1000; j++) {
            dataset.push({
                id: j + 1,
                agent: `Agent ${(j % 20) + 1}`,
                strategies: getRandomStrategy(),
                location: getRandomLocation(),
                risk: Math.floor(Math.random() * 100)
            });
        }
        datasets.push(dataset);
    }

    return new GridDataModel(datasets);
};

const getRandomStrategy = () => {
    const strategies = [
        'Momentum',
        'Mean Reversion',
        'Trend Following',
        'Statistical Arbitrage',
        'Market Making'
    ];
    return strategies[Math.floor(Math.random() * strategies.length)];
};

const getRandomLocation = () => {
    const locations = [
        'New York',
        'London',
        'Tokyo',
        'Singapore',
        'Hong Kong'
    ];
    return locations[Math.floor(Math.random() * locations.length)];
};