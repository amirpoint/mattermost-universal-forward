import * as api from './api';
import {buildCopyMessage} from './buildCopyMessage';
import {Dest, Mode, decideMode} from './decideMode';
import {Channel, Post, User} from './types';

export type Target = {kind: 'channel'; channel: Channel} | {kind: 'user'; user: User};

export async function planForward(post: Post, target: Target): Promise<{mode: Mode; destChannelId: string | null}> {
    const source = await api.getChannel(post.channel_id);
    const sourceInfo = {type: source.type, teamId: source.team_id};

    if (target.kind === 'channel') {
        const dest: Dest = {kind: 'channel', teamId: target.channel.team_id};
        return {mode: decideMode(sourceInfo, dest), destChannelId: target.channel.id};
    }
    const member = await api.getUserIsChannelMember(source.id, target.user.id);
    return {mode: decideMode(sourceInfo, {kind: 'dm', userIsSourceMember: member}), destChannelId: null};
}

// DM/GM channels have no team, so a permalink falls back to the team in the current URL
// (after the SiteURL base path, if Mattermost is served under a subpath).
function currentTeamName(siteUrl: string): string {
    const base = new URL(siteUrl).pathname.replace(/\/$/, '');
    const path = window.location.pathname;
    const rest = base && path.startsWith(base) ? path.slice(base.length) : path;
    return rest.split('/')[1] || '';
}

const DIRECT_MESSAGE_LABEL = 'پیام مستقیم';
const channelLabel = (c: Channel) => (c.type === 'D' ? DIRECT_MESSAGE_LABEL : c.display_name || c.name);

export async function forwardPost(post: Post, target: Target, note: string, siteUrl: string): Promise<{mode: Mode}> {
    const {mode, destChannelId} = await planForward(post, target);
    const destId = destChannelId ?? (await api.createDirectChannel((target as {user: User}).user.id)).id;
    const source = await api.getChannel(post.channel_id);

    let message: string;
    if (mode === 'permalink') {
        const teamName = source.team_id ? (await api.getTeam(source.team_id)).name : currentTeamName(siteUrl);
        const link = `${siteUrl}/${teamName}/pl/${post.id}`;
        message = note ? `${note}\n${link}` : link;
    } else {
        const [author, fileNames] = await Promise.all([api.getUser(post.user_id), api.getFileNames(post.id)]);
        message = buildCopyMessage({
            message: post.message,
            username: author.username,
            channelName: channelLabel(source),
            createAt: post.create_at,
            fileNames,
            note: note || undefined,
        });
    }
    await api.createPost(destId, message);
    return {mode};
}
