import * as api from './api';
import {forwardPost, planForward} from './forwardPost';

jest.mock('./api');
const m = api as jest.Mocked<typeof api>;

const post = {id: 'p1', channel_id: 'src', user_id: 'u9', message: 'hello', create_at: Date.UTC(2026, 10, 8, 10, 30)};
const channel = (over: object) => ({id: 'src', type: 'O', team_id: 't1', name: 'town-square', display_name: 'Town Square', ...over});
const user = {id: 'u2', username: 'sara'};

beforeEach(() => {
    jest.resetAllMocks();
    m.getChannel.mockResolvedValue(channel({}));
    m.getTeam.mockResolvedValue({id: 't1', name: 'myteam'});
    m.getUser.mockResolvedValue({id: 'u9', username: 'ali'});
    m.getFileNames.mockResolvedValue([]);
    m.createPost.mockResolvedValue({id: 'new'} as any);
    m.createDirectChannel.mockResolvedValue(channel({id: 'dm1', type: 'D', team_id: ''}));
});

describe('forwardPost', () => {
    test('DM target that is a source member gets a permalink with the team name', async () => {
        m.getUserIsChannelMember.mockResolvedValue(true);
        await forwardPost(post, {kind: 'user', user}, '', 'https://mm.test');
        expect(m.createPost).toHaveBeenCalledWith('dm1', 'https://mm.test/myteam/pl/p1');
    });
    test('DM target that is not a source member gets a quoted copy', async () => {
        m.getUserIsChannelMember.mockResolvedValue(false);
        await forwardPost(post, {kind: 'user', user}, '', 'https://mm.test');
        expect(m.createPost.mock.calls[0][1]).toContain('> hello');
    });
    test('public same-team channel target gets a permalink, with the note first', async () => {
        const dest = channel({id: 'dst', team_id: 't1'});
        await forwardPost(post, {kind: 'channel', channel: dest}, 'FYI', 'https://mm.test');
        expect(m.createPost).toHaveBeenCalledWith('dst', 'FYI\nhttps://mm.test/myteam/pl/p1');
    });
    test('private source with a channel target gets a copy', async () => {
        m.getChannel.mockResolvedValue(channel({type: 'P'}));
        const dest = channel({id: 'dst'});
        const result = await forwardPost(post, {kind: 'channel', channel: dest}, '', 'https://mm.test');
        expect(result.mode).toBe('copy');
        expect(m.createPost.mock.calls[0][1]).toContain('فوروارد از @​ali');
    });
    test('creates the DM channel exactly once, before posting', async () => {
        m.getUserIsChannelMember.mockResolvedValue(true);
        await forwardPost(post, {kind: 'user', user}, '', 'https://mm.test');
        expect(m.createDirectChannel).toHaveBeenCalledTimes(1);
        expect(m.createDirectChannel.mock.invocationCallOrder[0]).toBeLessThan(m.createPost.mock.invocationCallOrder[0]);
    });
    test('propagates the server error message from createPost', async () => {
        m.getUserIsChannelMember.mockResolvedValue(true);
        m.createPost.mockRejectedValue(new Error('no permission'));
        await expect(forwardPost(post, {kind: 'user', user}, '', 'https://mm.test')).rejects.toThrow('no permission');
    });
});

describe('forwardPost edge cases', () => {
    test('DM source copy is labelled as a direct message, not the raw id pair', async () => {
        m.getChannel.mockResolvedValue(channel({type: 'D', team_id: '', name: 'aaa__bbb', display_name: ''}));
        await forwardPost(post, {kind: 'channel', channel: channel({id: 'dst'})}, '', 'https://mm.test');
        const text = m.createPost.mock.calls[0][1];
        expect(text).toContain('پیام مستقیم');
        expect(text).not.toContain('__');
    });
    test('permalink under a subpath SiteURL keeps the base path and reads the team after it', async () => {
        window.history.pushState({}, '', '/chat/myteam/channels/town-square');
        m.getChannel.mockResolvedValue(channel({type: 'G', team_id: ''}));
        m.getUserIsChannelMember.mockResolvedValue(true);
        await forwardPost(post, {kind: 'user', user}, '', 'https://host/chat');
        expect(m.createPost).toHaveBeenCalledWith('dm1', 'https://host/chat/myteam/pl/p1');
        window.history.pushState({}, '', '/');
    });
});

describe('planForward', () => {
    test('reports the mode without sending anything', async () => {
        m.getUserIsChannelMember.mockResolvedValue(false);
        const plan = await planForward(post, {kind: 'user', user});
        expect(plan).toEqual({mode: 'copy', destChannelId: null});
        expect(m.createPost).not.toHaveBeenCalled();
    });
});
