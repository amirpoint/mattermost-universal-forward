import {canForward} from './canForward';

describe('canForward', () => {
    test('allows a normal post', () => {
        expect(canForward({id: 'p', type: '', delete_at: 0})).toBe(true);
    });
    test.each([
        ['system post', {type: 'system_join_channel'}],
        ['delete_at set', {delete_at: 5}],
        ['redux-deleted post', {state: 'DELETED'}],
        ['pending post', {id: 'x', pending_post_id: 'x'}],
        ['failed post', {failed: true}],
    ])('rejects a %s', (_name, over) => {
        expect(canForward({id: 'p', type: '', delete_at: 0, ...over})).toBe(false);
    });
    test('rejects a missing post', () => {
        expect(canForward(undefined)).toBe(false);
    });
});
