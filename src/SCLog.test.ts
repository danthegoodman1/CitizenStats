import { describe, it, expect } from 'vitest';
import { parseAuthLogLine } from './SCLog';

describe('parseAuthLogLine', () => {
    it('should correctly parse a log line with trailing content', () => {
        const logLine = '<2024-10-29T20:08:50.661Z> [Notice] <AccountLoginCharacterStatus_Character> Character: createdAt 1729625080109 - updatedAt 1729625080670 - geid 200379493705 - accountId 589617 - name mrdanthegoodman - state STATE_CURRENT [Team_GameServices][Login]';
        
        const result = parseAuthLogLine(logLine);
        
        expect(result).toEqual({
            time: new Date('2024-10-29T20:08:50.661Z'),
            level: 'Notice',
            kind: 'AccountLoginCharacterStatus_Character',
            content: 'Character: createdAt 1729625080109 - updatedAt 1729625080670 - geid 200379493705 - accountId 589617 - name mrdanthegoodman - state STATE_CURRENT [Team_GameServices][Login]',
            createdAt: 1729625080109,
            updatedAt: 1729625080670,
            geid: 200379493705,
            accountId: 589617,
            characterName: 'mrdanthegoodman',
            state: 'STATE_CURRENT'
        });
    });
}); 
