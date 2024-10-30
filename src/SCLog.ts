export interface SCLogLine {
    time: Date;
    level: string | null;
    kind: string | null;
    content: string;
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
    };
}
