import { open, watch } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';

interface TailOptions {
    onLine: (line: string) => void;
    onError?: (error: Error) => void;
}

export class FileTailer extends EventEmitter {
    private filePath: string;
    private offset: number = 0;
    private isRunning: boolean = false;
    private watcher: AbortController;

    constructor(filePath: string) {
        super();
        this.filePath = filePath;
        this.watcher = new AbortController();
    }

    async start({ onLine, onError = console.error }: TailOptions): Promise<void> {
        this.isRunning = true;

        const watchFile = async () => {
            try {
                // Watch for file changes
                const watcher = watch(
                    this.filePath, 
                    { signal: this.watcher.signal }
                );

                for await (const event of watcher) {
                    if (!this.isRunning) break;
                    await this.readNewLines(onLine);
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                if (err instanceof Error && !err.message.includes('ENOENT')) {
                    onError(err as Error);
                }
                // If file doesn't exist, retry after delay
                if (this.isRunning) {
                    setTimeout(() => watchFile(), 1000);
                }
            }
        };

        // Initial read and start watching
        await this.readNewLines(onLine);
        watchFile();
    }

    stop(): void {
        this.isRunning = false;
        this.watcher.abort();
        this.emit('stopped');
    }

    private async readNewLines(onLine: (line: string) => void): Promise<void> {
        try {
            const fileHandle = await open(this.filePath, 'r');
            const stats = await fileHandle.stat();

            // If file size is less than offset, reset offset (file was truncated)
            if (stats.size < this.offset) {
                this.offset = 0;
            }

            const stream = createReadStream(this.filePath, {
                start: this.offset,
                encoding: 'utf-8'
            });

            const rl = createInterface({
                input: stream,
                crlfDelay: Infinity
            });

            for await (const line of rl) {
                if (!this.isRunning) break;
                onLine(line);
            }

            // Update offset
            this.offset = stats.size;

            await fileHandle.close();
        } catch (err) {
            if (err instanceof Error && !err.message.includes('ENOENT')) {
                throw err;
            }
        }
    }
}

// Example usage:
/*
const tailer = new FileTailer('/path/to/file.log');

// Start tailing
await tailer.start({
    onLine: (line) => console.log(line),
    onError: (error) => console.error('Tail error:', error)
});

// To stop tailing
tailer.stop();
*/ 
