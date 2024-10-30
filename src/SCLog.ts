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

export interface SCAuthLogLine extends SCLogLine {
    characterName: string;
    createdAt: number;
    updatedAt: number;
    geid: number;
    accountId: number;
    state: string;
}

export function parseAuthLogLine(logLine: string): SCAuthLogLine | null {
    // First parse using the base parser
    const baseParsed = parseLogLine(logLine);
    if (!baseParsed) return null;

    // Parse the content section for character details
    const regex = /Character: createdAt (\d+) - updatedAt (\d+) - geid (\d+) - accountId (\d+) - name (\w+) - state (\w+)/;
    const matches = baseParsed.content.match(regex);

    if (!matches) {
        console.warn(`Failed to parse character details from log line: ${logLine}`);
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
