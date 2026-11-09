import React, {useEffect, useState} from 'react';

import * as api from './api';
import {Target, forwardPost, planForward} from './forwardPost';
import {closeForward, getForwardPost, getSiteUrl, subscribe} from './modalState';
import {Channel, Post, User} from './types';

const COPY_WARNING = 'متن پیام کپی می‌شود (گیرنده به کانال مبدأ دسترسی ندارد)';
const MIN_TERM = 2;
const DEBOUNCE_MS = 250;

export default function ForwardModal() {
    const [post, setPost] = useState<Post | null>(getForwardPost());
    const [term, setTerm] = useState('');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [target, setTarget] = useState<Target | null>(null);
    const [copyMode, setCopyMode] = useState(false);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => subscribe(() => {
        setPost(getForwardPost());
        setTerm('');
        setChannels([]);
        setUsers([]);
        setTarget(null);
        setCopyMode(false);
        setNote('');
        setError('');
        setSending(false);
    }), []);

    useEffect(() => {
        if (term.trim().length < MIN_TERM) {
            return undefined;
        }
        const timer = setTimeout(async () => {
            try {
                const [c, u] = await Promise.all([api.searchChannels(term.trim()), api.searchUsers(term.trim())]);
                setChannels(c);
                setUsers(u);
            } catch (e) {
                setError((e as Error).message);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [term]);

    if (!post) {
        return null;
    }

    const select = async (t: Target) => {
        setTarget(t);
        setError('');
        try {
            setCopyMode((await planForward(post, t)).mode === 'copy');
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const send = async () => {
        if (!target) {
            return;
        }
        setSending(true);
        setError('');
        try {
            await forwardPost(post, target, note, getSiteUrl());
            closeForward();
        } catch (e) {
            setError((e as Error).message);
            setSending(false);
        }
    };

    return (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div role='dialog' aria-label='Forward message' style={{background: 'var(--center-channel-bg, #fff)', color: 'var(--center-channel-color, #000)', padding: 24, borderRadius: 8, width: 480, maxWidth: '90vw'}}>
                <h4>{'Forward message'}</h4>
                <input
                    autoFocus={true}
                    placeholder='Search channels or people'
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    style={{width: '100%', marginBottom: 8}}
                />
                <div style={{maxHeight: 200, overflowY: 'auto'}}>
                    {channels.map((c) => (
                        <div key={c.id}>
                            <button type='button' onClick={() => select({kind: 'channel', channel: c})}>{c.display_name || c.name}</button>
                        </div>
                    ))}
                    {users.map((u) => (
                        <div key={u.id}>
                            <button type='button' onClick={() => select({kind: 'user', user: u})}>{`@${u.username}`}</button>
                        </div>
                    ))}
                </div>
                {target && <p>{`To: ${target.kind === 'channel' ? (target.channel.display_name || target.channel.name) : `@${target.user.username}`}`}</p>}
                {copyMode && <p style={{color: '#d24b4e'}}>{COPY_WARNING}</p>}
                <textarea
                    placeholder='Add a note (optional)'
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{width: '100%'}}
                />
                {error && <p style={{color: '#d24b4e'}}>{error}</p>}
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
                    <button type='button' onClick={closeForward}>{'Cancel'}</button>
                    <button type='button' disabled={!target || sending} onClick={send}>{'Send'}</button>
                </div>
            </div>
        </div>
    );
}
