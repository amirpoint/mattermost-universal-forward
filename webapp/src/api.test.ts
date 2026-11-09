import {createPost, getUserIsChannelMember, searchUsers} from './api';

const ok = (body: unknown) => Promise.resolve({ok: true, status: 200, json: () => Promise.resolve(body)} as Response);
const fail = (status: number, message: string) =>
    Promise.resolve({ok: false, status, json: () => Promise.resolve({message})} as Response);

beforeEach(() => {
    document.cookie = 'MMCSRF=tok123';
    (global as any).fetch = jest.fn();
});

describe('api', () => {
    test('sends the CSRF token and XHR header with the session cookie', async () => {
        (fetch as jest.Mock).mockReturnValue(ok([]));
        await searchUsers('al');
        const [url, init] = (fetch as jest.Mock).mock.calls[0];
        expect(url).toBe('/api/v4/users/search');
        expect(init.headers['X-CSRF-Token']).toBe('tok123');
        expect(init.headers['X-Requested-With']).toBe('XMLHttpRequest');
        expect(init.credentials).toBe('same-origin');
    });
    test('throws the server message on a non-2xx response', async () => {
        (fetch as jest.Mock).mockReturnValue(fail(403, 'no permission'));
        await expect(createPost('c1', 'hi')).rejects.toThrow('no permission');
    });
    test('getUserIsChannelMember is false on 404 and true on 200', async () => {
        (fetch as jest.Mock).mockReturnValueOnce(fail(404, 'not found'));
        expect(await getUserIsChannelMember('c1', 'u1')).toBe(false);
        (fetch as jest.Mock).mockReturnValueOnce(ok({}));
        expect(await getUserIsChannelMember('c1', 'u1')).toBe(true);
    });
    test('createPost posts channel_id and message', async () => {
        (fetch as jest.Mock).mockReturnValue(ok({id: 'p1'}));
        await createPost('c1', 'hello');
        const [url, init] = (fetch as jest.Mock).mock.calls[0];
        expect(url).toBe('/api/v4/posts');
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual({channel_id: 'c1', message: 'hello'});
    });
});
