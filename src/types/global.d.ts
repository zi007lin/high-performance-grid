export {};

declare global {
    interface Window {
        gridUpdateEmitter?: {
            emit(count: number): void;
        };
    }
}
