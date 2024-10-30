import fetchWithRetry from "./fetch";
import log from 'electron-log';

export interface SCLogLine {
    time: Date;
    level: string | null;
    kind: string | null;
    content: string;
    originalContent: string;
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
    player: SCAuthLogLine | null;
    events: SCLogLine[];
}

export class LogShipper {
    private buffer: SCLogLine[] = [];
    private playerInfo: SCAuthLogLine | null = null;
    private apiEndpoint: string;
    private lastShipTime: number = 0;
    private shipInterval: number
    private shipTimeout: NodeJS.Timeout | null = null;

    constructor(apiEndpoint: string, shipInterval: number = 1000) {
        this.apiEndpoint = apiEndpoint;
        this.shipInterval = shipInterval;
    }

    public async handleLogLine(logLine: SCLogLine) {
        this.buffer.push(logLine);

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
        if (this.buffer.length === 0) {
            this.shipTimeout = null;
            return;
        }

        // Skip shipping if API endpoint is blank
        if (!this.apiEndpoint.trim()) {
            log.warn('Skipping log shipment: API endpoint is blank');
            this.buffer = []; // Clear buffer since we won't be sending these logs
            this.shipTimeout = null;
            return;
        }

        const eventsToShip = [...this.buffer];
        this.lastShipTime = Date.now();
        this.shipTimeout = null;

        const payload = {
            player: this.playerInfo,
            events: eventsToShip
        };

        try {
            await fetchWithRetry(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            // Only clear the buffer after successful API call
            this.buffer = [];
        } catch (error) {
            log.error('Failed to ship logs:', error);
            this.scheduleShipment(); // Try again later
        }
    }

    public setPlayerInfo(player: SCAuthLogLine) {
        this.playerInfo = player;

        // If we have buffered logs, schedule a shipment
        if (this.buffer.length > 0) {
            this.scheduleShipment();
        }
    }
}
