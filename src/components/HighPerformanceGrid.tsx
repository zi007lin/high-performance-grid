import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    ColDef,
    GridReadyEvent,
    ValueGetterParams,
    ClientSideRowModelModule,
    ModuleRegistry,
    NumberFilterModule,
    TextFilterModule,
    GridOptions,
    RowModelType,
    ViewportChangedEvent,
    CellEditingStartedEvent,
    CellEditingStoppedEvent,
    GridApi,
} from 'ag-grid-community';
import { GridDataModel, RowData } from './GridDataModel';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    NumberFilterModule,
    TextFilterModule,
]);

interface HighPerformanceGridProps {
    dataModel: GridDataModel;
}

declare global {
    interface Window {
        gridUpdateEmitter?: {
            emit(count: number): void;
        };
    }
}

const HighPerformanceGrid: React.FC<HighPerformanceGridProps> = ({ dataModel }) => {
    const gridRef = useRef<AgGridReact>(null);
    const frameCountRef = useRef<number>(0);
    const [rowData, setRowData] = useState<RowData[]>([]);
    const [updateTime, setUpdateTime] = useState<number>(0);
    const [averageUpdateTime, setAverageUpdateTime] = useState<number>(0);
    const [isPaused, setIsPaused] = useState(false);

    const updateTimesRef = useRef<number[]>([]);
    const visibleRowsRef = useRef<{ start: number, end: number }>({ start: 0, end: 50 });
    const animationFrameRef = useRef<number | undefined>(undefined);
    const lastFrameTimeRef = useRef<number>(0);
    const isFilteringRef = useRef(false);
    const isEditingRef = useRef(false);

    const defaultColDef = {
        sortable: true,
        filter: true,
        resizable: true,
        suppressHeaderMenuButton: true,
        suppressHeaderContextMenu: true,
        filterParams: {
            buttons: ['reset', 'apply'],
            closeOnApply: true
        }
    };

    const columnDefs: ColDef[] = [
        { field: 'id', headerName: 'ID', sortable: true, filter: true, resizable: true, width: 100 },
        {
            field: 'agent',
            headerName: 'agent',
            sortable: true,
            filter: true,
            resizable: true,
            width: 150,
            editable: true,
            cellStyle: { backgroundColor: 'rgba(0, 166, 237, 0.1)' }
        },
        { field: 'strategies', headerName: 'strategy', sortable: true, filter: true, width: 200 },
        { field: 'location', headerName: 'location', sortable: true, filter: true, width: 150 },
        { field: 'risk', headerName: 'risk', sortable: true, filter: 'agNumberColumnFilter', width: 150, valueFormatter: (params) => `$${params.value?.toLocaleString() || 0}` }
    ];

    // id: number;
    // agent: string;
    // strategies: string;
    // location: string;
    // risk: number;

    const gridOptions: GridOptions<RowData> = {
        rowModelType: 'clientSide' as RowModelType,
        suppressAnimationFrame: true,
        suppressColumnVirtualisation: false,
        suppressRowVirtualisation: false,
        rowBuffer: 10,
        suppressPropertyNamesCheck: true,
        suppressRowHoverHighlight: true,
        getRowId: (params) => params.data.id.toString(),
        animateRows: false,
        pagination: false,
        cacheBlockSize: 100,
        maxBlocksInCache: 10,
        domLayout: 'normal',
        onFilterOpened: () => {
            isFilteringRef.current = true;
            setIsPaused(true);
        },
        onFilterChanged: () => {
            isFilteringRef.current = false;
            setIsPaused(false);
        },
        onCellEditingStarted: (event: CellEditingStartedEvent) => {
            console.log('Cell editing started:', event);
            isEditingRef.current = true;
        },
        onCellEditingStopped: (event: CellEditingStoppedEvent) => {
            console.log('Cell editing stopped:', event);
            isEditingRef.current = false;
        }
    };

    const onViewportChanged = useCallback((event: ViewportChangedEvent) => {
        if (gridRef.current?.api) {
            const firstRow = gridRef.current.api.getFirstDisplayedRowIndex();
            const lastRow = gridRef.current.api.getLastDisplayedRowIndex();
            if (firstRow !== null && lastRow !== null) {
                visibleRowsRef.current = { start: firstRow, end: lastRow };
            }
        }
    }, []);

    const renderLoop = useCallback((timestamp: number) => {
        if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;

        const frameTime = timestamp - lastFrameTimeRef.current;
        const targetFrameTime = 1000 / 15; // 15 FPS

        if (frameTime >= targetFrameTime && !isPaused && !isFilteringRef.current && !isEditingRef.current) {
            const startTime = performance.now();

            if (gridRef.current?.api) {
                const newData = dataModel.dequeueData();
                const visibleRange = visibleRowsRef.current;

                setRowData(newData);

                const visibleData = newData.slice(visibleRange.start, visibleRange.end + 1);
                const transaction = {
                    update: visibleData
                };
                gridRef.current.api.applyTransactionAsync(transaction);

                // Increment frame counter
                frameCountRef.current += visibleData.length;
            }

            const endTime = performance.now();
            const updateDuration = endTime - startTime;

            updateTimesRef.current.push(updateDuration);
            if (updateTimesRef.current.length > 10) {
                updateTimesRef.current.shift();
            }

            const avgTime = updateTimesRef.current.reduce((a: number, b: number) => a + b, 0) / updateTimesRef.current.length;

            setUpdateTime(updateDuration);
            setAverageUpdateTime(avgTime);

            // Emit total updates every second
            if (timestamp - lastFrameTimeRef.current >= 1000) {
                window.gridUpdateEmitter?.emit(frameCountRef.current);
                frameCountRef.current = 0;
            }

            lastFrameTimeRef.current = timestamp;
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop);
    }, [dataModel, isPaused]);


    useEffect(() => {
        const initialData = dataModel.dequeueData();
        setRowData(initialData);

        animationFrameRef.current = requestAnimationFrame(renderLoop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [renderLoop, dataModel]);

    const onGridReady = useCallback((params: GridReadyEvent) => {
        params.api.sizeColumnsToFit();
    }, []);

    return (
        <div style={{ background: '#1a1b1e' }}>
            <div style={{
                padding: '10px',
                background: '#252629',
                marginBottom: '10px',
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                color: '#ffffff'
            }}>
                <div>
                    <strong>Last Update Time:</strong> {updateTime.toFixed(2)}ms
                </div>
                <div>
                    <strong>Average Update Time:</strong> {averageUpdateTime.toFixed(2)}ms
                </div>
                <div>
                    <strong>Updates Per Second:</strong> {(1000 / averageUpdateTime).toFixed(3)}
                </div>
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: isPaused ? '#00a6ed' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                    }}
                >
                    {isPaused ? 'Resume Updates' : 'Pause Updates'}
                </button>
            </div>
            <div
                className="ag-theme-alpine"
                style={{
                    height: 'calc(100vh - 60px)',
                    width: '100%',
                    '--ag-foreground-color': '#ffffff',
                    '--ag-background-color': '#1a1b1e',
                    '--ag-header-background-color': '#252629',
                    '--ag-odd-row-background-color': '#1e1f23',
                    '--ag-header-foreground-color': '#fff',
                    '--ag-header-cell-hover-background-color': '#2a2b2f',
                    '--ag-modal-overlay-background-color': 'rgba(24, 25, 28, 0.95)',
                    '--ag-selected-row-background-color': '#2d4865',
                    '--ag-row-hover-color': '#2a2b2f',
                    '--ag-column-hover-color': '#2a2b2f',
                    '--ag-input-focus-box-shadow': '0 0 2px 0.5px #00a6ed',
                    '--ag-input-focus-border-color': '#00a6ed',
                    '--ag-border-color': '#2d2e32',
                    '--ag-secondary-border-color': '#2d2e32',
                    '--ag-range-selection-border-color': '#00a6ed',
                    '--ag-cell-horizontal-border': 'solid #2d2e32',
                    '--ag-row-border-color': '#2d2e32',
                    '--ag-row-background-color': '#1a1b1e',
                    '--ag-alpine-active-color': '#00a6ed'
                } as React.CSSProperties}
            >
                <AgGridReact
                    ref={gridRef}
                    modules={[ClientSideRowModelModule]}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    gridOptions={gridOptions}
                    onGridReady={onGridReady}
                    onViewportChanged={onViewportChanged}
                />
            </div>
        </div>
    );
};

export default HighPerformanceGrid;
