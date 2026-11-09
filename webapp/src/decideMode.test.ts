import {decideMode} from './decideMode';

const pub = {type: 'O', teamId: 't1'};

describe('decideMode', () => {
    test('DM destination whose user is a source member gets a permalink', () => {
        expect(decideMode(pub, {kind: 'dm', userIsSourceMember: true})).toBe('permalink');
    });
    test('DM destination whose user is not a source member gets a copy', () => {
        expect(decideMode(pub, {kind: 'dm', userIsSourceMember: false})).toBe('copy');
    });
    test('channel destination in the same team as a public source gets a permalink', () => {
        expect(decideMode(pub, {kind: 'channel', teamId: 't1'})).toBe('permalink');
    });
    test('channel destination in a different team than a public source gets a copy', () => {
        expect(decideMode(pub, {kind: 'channel', teamId: 't2'})).toBe('copy');
    });
    test.each(['P', 'D', 'G'])('channel destination with a %s source gets a copy', (type) => {
        expect(decideMode({type, teamId: 't1'}, {kind: 'channel', teamId: 't1'})).toBe('copy');
    });
});
