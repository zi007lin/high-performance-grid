import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    ColDef,
    ClientSideRowModelModule,
    ModuleRegistry,
    NumberFilterModule,
    TextFilterModule,
    ColumnAutoSizeModule,
    ValidationModule,
    RowModelType,
    GridOptions
} from 'ag-grid-community';
import { GridDataModel, RowData } from './GridDataModel';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    NumberFilterModule,
    TextFilterModule,
    ColumnAutoSizeModule,
    ValidationModule
]);

interface HighPerformanceGridProps {
    dataModel: GridDataModel;
}

const HighPerformanceGrid: React.FC<HighPerformanceGridProps> = ({ dataModel }) => {
    const gridRef = useRef<AgGridReact>(null);
    const [rowData, setRowData] = useState<RowData[]>([]);
    const [isPaused, setIsPaused] = useState(false);

    const visibleRowsRef = useRef<{ start: number, end: number }>({ start: 0, end: 50 });
    const animationFrameRef = useRef<number | undefined>(undefined);

    const columnDefs: ColDef[] = [
        { field: 'id', headerName: 'ID', width: 100 },
        {
            field: 'agent',
            headerName: 'Agent',
            width: 150,
            editable: true,
            cellStyle: { backgroundColor: 'rgba(0, 166, 237, 0.1)' }
        },
        { field: 'strategies', headerName: 'Strategy', width: 200 },
        { field: 'location', headerName: 'Location', width: 150 },
        { field: 'risk', headerName: 'Risk', width: 150, valueFormatter: (params) => `$${params.value?.toLocaleString() || 0}` }
    ];

    const gridOptions: GridOptions<RowData> = {
        rowModelType: 'clientSide' as RowModelType,
        getRowId: (params) => params.data.id.toString(),
        pagination: false
    };

    const renderLoop = useCallback((timestamp: number) => {
        if (!isPaused) {
            if (gridRef.current?.api) {
                const newData = dataModel.dequeueData();
                setRowData(newData);

                const visibleRange = visibleRowsRef.current;
                const visibleData = newData.slice(visibleRange.start, visibleRange.end + 1);

                const transaction = { update: visibleData };
                gridRef.current.api.applyTransactionAsync(transaction);

                // Emit the update count
                window.gridUpdateEmitter?.emit(newData.length);
            }
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
            <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 60px)', width: '100%' }}>
                <AgGridReact
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    gridOptions={gridOptions}
                />
            </div>
        </div>
    );
};

export default HighPerformanceGrid;
