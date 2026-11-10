import {builtinForwardIsLocked, postIdFromBuiltinForward} from './builtinForward';

describe('postIdFromBuiltinForward', () => {
    test('reads the post id from the built-in menu item', () => {
        expect(postIdFromBuiltinForward('forward_post_abc123')).toBe('abc123');
    });
    test.each([null, undefined, '', 'other_post_abc', 'forward_post_'])('rejects %p', (testId) => {
        expect(postIdFromBuiltinForward(testId)).toBeNull();
    });
});

describe('builtinForwardIsLocked', () => {
    test('public channels keep the built-in forward', () => {
        expect(builtinForwardIsLocked('O')).toBe(false);
    });
    test.each(['D', 'G', 'P'])('locks %s', (type) => {
        expect(builtinForwardIsLocked(type)).toBe(true);
    });
    test('does not lock when the channel is unknown', () => {
        expect(builtinForwardIsLocked(undefined)).toBe(false);
    });
});
