import {Channel, Post, Team, User} from './types';

const BASE = '/api/v4';

function csrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)MMCSRF=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
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
        let message = `Request failed (${response.status})`;
        try {
            message = (await response.json()).message || message;
        } catch {
            // keep the generic message
        }
        const error = new Error(message);
        (error as any).status = response.status;
        throw error;
    }
    return response.json();
}

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

export const createPost = (channelId: string, message: string) =>
    request<Post>('/posts', {method: 'POST', body: {channel_id: channelId, message}});

export async function getFileNames(postId: string): Promise<string[]> {
    const files = await request<Array<{name: string}>>(`/posts/${postId}/files/info`);
    return files.map((f) => f.name);
}
