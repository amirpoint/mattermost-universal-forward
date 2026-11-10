import {Channel, Post, Team, User} from './types';

const BASE = '/api/v4';

function csrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)MMCSRF=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function errorFrom(response: Response): Promise<Error> {
    let message = `Request failed (${response.status})`;
    try {
        message = (await response.json()).message || message;
    } catch {
        // keep the generic message
    }
    const error = new Error(message);
    (error as any).status = response.status;
    return error;
}

async function request<T>(path: string, init: {method?: string; body?: unknown} = {}): Promise<T> {
    const response = await fetch(BASE + path, {
        method: init.method || 'GET',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': csrfToken(),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!response.ok) {
        throw await errorFrom(response);
    }
    return response.json();
}

const sessionHeaders = () => ({
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Token': csrfToken(),
});

export const getMe = () => request<User>('/users/me');
export const getUser = (id: string) => request<User>(`/users/${id}`);
export const getChannel = (id: string) => request<Channel>(`/channels/${id}`);
export const getTeam = (id: string) => request<Team>(`/teams/${id}`);

export async function getUserIsChannelMember(channelId: string, userId: string): Promise<boolean> {
    try {
        await request(`/channels/${channelId}/members/${userId}`);
        return true;
    } catch (e) {
        if ((e as any).status === 404) {
            return false;
        }
        throw e;
    }
}

export async function searchChannels(term: string): Promise<Channel[]> {
    const lower = term.toLowerCase();
    const channels = await request<Channel[]>('/users/me/channels');
    return channels.filter((c) => c.type !== 'D' && (c.display_name.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower)));
}

export const searchUsers = (term: string) => request<User[]>('/users/search', {method: 'POST', body: {term}});

export async function createDirectChannel(userId: string): Promise<Channel> {
    const me = await getMe();
    return request<Channel>('/channels/direct', {method: 'POST', body: [me.id, userId]});
}

export const createPost = (channelId: string, message: string, fileIds: string[] = []) =>
    request<Post>('/posts', {
        method: 'POST',
        body: fileIds.length ? {channel_id: channelId, message, file_ids: fileIds} : {channel_id: channelId, message},
    });

export type RemoteFile = {id: string; name: string};

export const getPostFiles = (postId: string) => request<RemoteFile[]>(`/posts/${postId}/files/info`);

export async function downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${BASE}/files/${fileId}`, {credentials: 'same-origin', headers: sessionHeaders()});
    if (!response.ok) {
        throw await errorFrom(response);
    }
    return response.blob();
}

export async function uploadFile(channelId: string, file: Blob, filename: string): Promise<string> {
    const body = new FormData();
    body.append('channel_id', channelId);
    body.append('files', file, filename || 'file');
    const response = await fetch(`${BASE}/files`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: sessionHeaders(),
        body,
    });
    if (!response.ok) {
        throw await errorFrom(response);
    }
    const uploaded = await response.json() as {file_infos?: Array<{id: string}>};
    const id = uploaded.file_infos && uploaded.file_infos[0] && uploaded.file_infos[0].id;
    if (!id) {
        throw new Error('Upload failed');
    }
    return id;
}
