import {buildCopyMessage} from './buildCopyMessage';

// 2026-11-08 10:30:00 UTC (TZ=UTC set in jest config)
const createAt = Date.UTC(2026, 10, 8, 10, 30);
const base = {username: 'ali', channelName: 'town-square', createAt, fileNames: [] as string[]};

describe('buildCopyMessage', () => {
    test('quotes the message and appends the source line', () => {
        const out = buildCopyMessage({...base, message: 'hi'});
        expect(out).toContain('> hi');
        expect(out).toContain('فوروارد از @ali در ~town-square، 2026-11-08 10:30');
    });
    test('prefixes every line of a multi-line message with "> "', () => {
        const out = buildCopyMessage({...base, message: 'a\nb\nc'});
        expect(out).toContain('> a\n> b\n> c');
    });
    test('file-only post lists the file names and has no empty quote line', () => {
        const out = buildCopyMessage({...base, message: '', fileNames: ['a.pdf']});
        expect(out).toContain('a.pdf');
        expect(out).not.toMatch(/^> $/m);
    });
    test.each(['channel', 'all', 'here'])('neutralizes @%s', (word) => {
        const out = buildCopyMessage({...base, message: `ping @${word} now`});
        expect(out).not.toContain(`@${word}`);
        expect(out).toContain(`@​${word}`);
    });
    test('truncates a 20000-char message to at most 16383 chars and keeps the source line', () => {
        const out = buildCopyMessage({...base, message: 'x'.repeat(20000)});
        expect(out.length).toBeLessThanOrEqual(16383);
        expect(out).toContain('…');
        expect(out).toContain('فوروارد از @ali');
    });
    test('puts the note first', () => {
        const out = buildCopyMessage({...base, message: 'hi', note: 'FYI'});
        expect(out.startsWith('FYI')).toBe(true);
    });
});
