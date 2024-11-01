import fetchWithRetry from "./fetch";
import log from 'electron-log';

export interface SCLogLine {
    time: Date;
    level: string | null;
    kind: string | null;
    content: string;
    originalContent: string;
    logLocation?: 'pu' | 'ac';
}

export function parseLogLine(logLine: string): SCLogLine | null {
    const regex = /^<([^>]+)>\s*(?:\[([^\]]+)\])?\s*(?:<([^>]+)>)?\s*(.*)$/;
    const matches = logLine.match(regex);

    if (!matches) {
        console.warn(`Failed to find timestamp from log line: ${logLine}`);
        return null;
    }

    // Parse timestamp
    const timestamp = new Date(matches[1]);
    if (isNaN(timestamp.getTime())) {
        console.warn(`Failed to parse timestamp from log line: ${logLine}`);
        return null;
    }

    // Handle log level
    let level: string | null = null;
    if (matches[2]) {
        const levelStr = matches[2];
        // Only accept specific log levels
        if (['Notice', 'Trace', 'Warn', 'Error'].includes(levelStr)) {
            level = levelStr;
        }
    }

    // Handle Kind
    const kind = matches[3] || null;

    // Get remaining content
    const content = matches[4].trim();

    return {
        time: timestamp,
        level,
        kind,
        content,
        originalContent: logLine,
    };
}

export interface SCAuthLogLine extends SCLogLine {
    characterName: string;
    createdAt: number;
    updatedAt: number;
    geid: number;
    accountId: number;
    state: string;
}

export function parseAuthLogLine(logLine: string): SCAuthLogLine | null {
    const baseParsed = parseLogLine(logLine);
    if (!baseParsed) return null;

    // Updated regex to allow for additional content after the state
    const regex = /Character: createdAt (\d+) - updatedAt (\d+) - geid (\d+) - accountId (\d+) - name (\w+) - state (\w+)(?:\s+.*)?$/;
    const matches = baseParsed.content.match(regex);

    if (!matches) {
        console.warn(`Failed to parse character details. Content: "${baseParsed.content}"`);
        return null;
    }

    return {
        ...baseParsed,
        createdAt: parseInt(matches[1]),
        updatedAt: parseInt(matches[2]),
        geid: parseInt(matches[3]),
        accountId: parseInt(matches[4]),
        characterName: matches[5],
        state: matches[6]
    };
}

export interface SCLogPayload {
    player: SCAuthLogLine;
    events: SCLogLine[];
}

export class LogShipper {
    private activeBuffer: SCLogLine[] = [];
    private shippingBuffer: SCLogLine[] = [];
    private playerInfo: SCAuthLogLine | null = null;
    private apiEndpoint: string;
    private lastShipTime: number = 0;
    private shipInterval: number
    private shipTimeout: NodeJS.Timeout | null = null;
    private shipRetries: number = 0;
    private maxRetries: number = 100;

    constructor(apiEndpoint: string, shipInterval: number = 1000) {
        this.apiEndpoint = apiEndpoint;
        this.shipInterval = shipInterval;
    }

    public async handleLogLine(logLine: SCLogLine) {
        this.activeBuffer.push(logLine);

        if (this.playerInfo) {
            this.scheduleShipment();
        }
    }

    private scheduleShipment() {
        if (this.shipTimeout) return; // Already scheduled

        const now = Date.now();
        const timeSinceLastShip = now - this.lastShipTime;
        const timeToWait = Math.max(0, this.shipInterval - timeSinceLastShip);

        this.shipTimeout = setTimeout(() => this.shipBatch(), timeToWait);
    }

    private async shipBatch() {
        if (this.activeBuffer.length === 0) {
            this.shipTimeout = null;
            this.shipRetries = 0;
            return;
        }

        // Skip shipping if API endpoint is blank
        if (!this.apiEndpoint.trim()) {
            log.warn('Skipping log shipment: API endpoint is blank');
            this.activeBuffer = [];
            this.shipTimeout = null;
            return;
        }

        // Swap buffers
        [this.activeBuffer, this.shippingBuffer] = [[], this.activeBuffer];
        this.lastShipTime = Date.now();
        this.shipTimeout = null;

        const payload = {
            player: this.playerInfo,
            events: this.shippingBuffer.map(({ content, ...rest }) => rest) // remove content
        };

        try {
            await fetchWithRetry(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            // Clear shipping buffer after successful API call
            this.shippingBuffer = [];
            this.shipRetries = 0;
            log.info(`Shipped ${payload.events.length} log events`);
        } catch (error) {
            // On failure, move logs back to active buffer
            this.activeBuffer = [...this.shippingBuffer, ...this.activeBuffer];
            this.shippingBuffer = [];
            this.shipRetries++;
            log.error(`Failed to ship logs (attempt ${this.shipRetries}/${this.maxRetries}):`, error);

            if (this.shipRetries >= this.maxRetries) {
                log.warn(`Exceeded maximum retry attempts (${this.maxRetries}). Clearing buffer.`);
                this.activeBuffer = [];
                this.shipRetries = 0;
            } else {
                this.scheduleShipment();
            }
        }
    }

    public setPlayerInfo(player: SCAuthLogLine) {
        this.playerInfo = player;

        // If we have buffered logs, schedule a shipment
        if (this.activeBuffer.length > 0) {
            this.scheduleShipment();
        }
    }
}
