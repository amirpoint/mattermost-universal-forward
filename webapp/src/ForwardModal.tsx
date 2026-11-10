import React, {useEffect, useRef, useState} from 'react';
import {Modal} from 'react-bootstrap';

import * as api from './api';
import {Target, forwardPost, planForward} from './forwardPost';
import {closeForward, getForwardPost, getSiteUrl, subscribe} from './modalState';
import {Channel, Post, User} from './types';

const COPY_WARNING = 'This message will be copied because the recipient cannot access the original channel.';
const MIN_TERM = 2;
const DEBOUNCE_MS = 250;

const STYLE = `
.uf-forward .uf-select{position:relative;display:flex;align-items:center;min-height:40px;padding:4px 8px;border-radius:4px;background:var(--center-channel-bg);box-shadow:inset 0 0 0 1px rgba(var(--center-channel-color-rgb),0.16);cursor:text}
.uf-forward .uf-select:focus-within{box-shadow:inset 0 0 0 2px var(--button-bg)}
.uf-forward .uf-select input{width:100%;border:0;outline:none;background:transparent;color:var(--center-channel-color);font-size:14px;line-height:20px}
.uf-forward .uf-select input::placeholder{color:rgba(var(--center-channel-color-rgb),0.64)}
.uf-forward .uf-menu{position:absolute;z-index:5;top:calc(100% + 4px);right:0;left:0;max-height:240px;margin:0;padding:4px 0;overflow-y:auto;list-style:none;border-radius:4px;background:var(--center-channel-bg);box-shadow:0 8px 24px rgba(0,0,0,.12),0 0 0 1px rgba(var(--center-channel-color-rgb),0.16)}
.uf-forward .uf-label{padding:10px 12px 4px;color:rgba(var(--center-channel-color-rgb),0.56);font-size:12px;font-weight:600;line-height:16px}
.uf-forward .uf-menu button,.uf-forward .uf-selected{display:block;width:100%;padding:6px 12px;border:0;background:transparent;color:inherit;cursor:pointer;text-align:left}
.uf-forward .uf-menu button:hover{background:rgba(var(--button-bg-rgb),0.08)}
.uf-forward .uf-icon{display:flex;width:24px;height:24px;align-items:center;justify-content:center;color:rgba(var(--center-channel-color-rgb),0.75)}
.uf-forward .uf-icon img{width:24px;height:24px;border-radius:50%}
.uf-forward textarea#forward_post_textbox{width:100%;border-radius:4px;background:transparent;color:inherit;font:inherit;resize:vertical}
.uf-forward .uf-note{display:grid;padding:16px;border:1px solid rgba(var(--semantic-color-info,var(--button-bg-rgb)),0.16);border-radius:4px;background:rgba(var(--semantic-color-info,var(--button-bg-rgb)),0.08);color:rgb(var(--center-channel-color-rgb));column-gap:8px;font-size:14px;grid-template-columns:24px minmax(0,1fr);line-height:20px}
.uf-forward .uf-note p{margin:0}
.uf-forward .uf-note svg{fill:rgb(var(--semantic-color-info,var(--button-bg-rgb)))}
.uf-forward .post-message__text{white-space:pre-wrap;word-break:break-word}
`;

function relativeTime(ms: number): string {
    const minutes = Math.round((Date.now() - ms) / 60000);
    if (minutes < 1) {
        return 'now';
    }
    if (minutes < 60) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    const days = Math.round(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

function GlobeIcon() {
    return (
        <svg width='16' height='16' viewBox='0 0 24 24' aria-hidden='true'>
            <path fill='currentColor' d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.93 9h-3.18a15.7 15.7 0 0 0-1.2-5.02A8.03 8.03 0 0 1 19.93 11zM12 4c.7 1.1 1.5 3.1 1.8 5H10.2c.3-1.9 1.1-3.9 1.8-5zM4.07 13h3.18a15.7 15.7 0 0 0 1.2 5.02A8.03 8.03 0 0 1 4.07 13zm3.18-2H4.07a8.03 8.03 0 0 1 4.38-5.02A15.7 15.7 0 0 0 7.25 11zM12 20c-.7-1.1-1.5-3.1-1.8-5h3.6c-.3 1.9-1.1 3.9-1.8 5zm2.55-7h-5.1A13.4 13.4 0 0 1 9.2 9h5.6a13.4 13.4 0 0 1-.25 4zm.2 2a13.4 13.4 0 0 1-.25 4.02A8.03 8.03 0 0 0 19.93 13h-5.18z'/>
        </svg>
    );
}

function LockIcon() {
    return (
        <svg width='16' height='16' viewBox='0 0 24 24' aria-hidden='true'>
            <path fill='currentColor' d='M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V7zm7 12H7v-8h10v8z'/>
        </svg>
    );
}

function InfoIcon() {
    return (
        <svg width='20' height='20' viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M11 9h2V7h-2m1 13a8 8 0 1 1 0-16 8 8 0 0 1 0 16m0-1.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13M11 17h2v-6h-2v6z'/>
        </svg>
    );
}

function TargetIcon({target}: {target: Target}) {
    if (target.kind === 'user') {
        return (
            <span className='uf-icon'>
                <img alt='' src={`/api/v4/users/${target.user.id}/image`}/>
            </span>
        );
    }
    return <span className='uf-icon'>{target.channel.type === 'P' ? <LockIcon/> : <GlobeIcon/>}</span>;
}

function TargetRow({target, variant}: {target: Target; variant: 'option' | 'singleValue'}) {
    const name = target.kind === 'channel' ? (target.channel.display_name || target.channel.name) : target.user.username;
    const description = target.kind === 'channel' ? `~${target.channel.name}` : `@${target.user.username}`;
    return (
        <div className={variant}>
            <TargetIcon target={target}/>
            <span className='option__content'>
                <span className='option__content--text'>{name}</span>
                <span className='option__content--description'>{description}</span>
            </span>
        </div>
    );
}

export default function ForwardModal() {
    const [post, setPost] = useState<Post | null>(getForwardPost());
    const [term, setTerm] = useState('');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [target, setTarget] = useState<Target | null>(null);
    const [editing, setEditing] = useState(true);
    const [copyMode, setCopyMode] = useState(false);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [author, setAuthor] = useState('');
    const [sourceName, setSourceName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => subscribe(() => {
        setPost(getForwardPost());
        setTerm('');
        setChannels([]);
        setUsers([]);
        setTarget(null);
        setEditing(true);
        setCopyMode(false);
        setNote('');
        setError('');
        setSending(false);
        setAuthor('');
        setSourceName('');
    }), []);

    useEffect(() => {
        if (!post) {
            return undefined;
        }
        let alive = true;
        Promise.all([api.getUser(post.user_id), api.getChannel(post.channel_id)]).then(([user, channel]) => {
            if (!alive || !user || !channel) {
                return;
            }
            setAuthor(user.username);
            setSourceName(`~${channel.display_name || channel.name}`);
        }).catch(() => undefined);
        return () => {
            alive = false;
        };
    }, [post]);

    useEffect(() => {
        if (term.trim().length < MIN_TERM) {
            return undefined;
        }
        const timer = setTimeout(async () => {
            try {
                const [foundChannels, foundUsers] = await Promise.all([api.searchChannels(term.trim()), api.searchUsers(term.trim())]);
                setChannels(foundChannels);
                setUsers(foundUsers);
            } catch (e) {
                setError((e as Error).message);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [term]);

    if (!post) {
        return null;
    }

    const select = async (next: Target) => {
        setTarget(next);
        setTerm('');
        setEditing(false);
        setChannels([]);
        setUsers([]);
        setError('');
        try {
            setCopyMode((await planForward(post, next)).mode === 'copy');
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

    const menuOpen = editing && term.trim().length >= MIN_TERM;
    const container = typeof document !== 'undefined' ? (document.querySelector('.app__body') || document.body) : undefined;

    return (
        <Modal
            show={true}
            onHide={closeForward}
            container={container}
            dialogClassName='a11y__modal GenericModal GenericModal__compassDesign forward-post'
            aria-labelledby='forwardPostModalLabel'
        >
            <Modal.Header closeButton={true}>
                <div className='GenericModal__header__text_container'>
                    <div className='GenericModal__header'>
                        <Modal.Title componentClass='h1' id='forwardPostModalLabel'>
                            {'Forward message'}
                        </Modal.Title>
                    </div>
                </div>
            </Modal.Header>
            <Modal.Body>
                <style>{STYLE}</style>
                <div className='GenericModal__body padding'>
                <div className='forward-post__body uf-forward'>
                    <div className='forward-post__select'>
                        <div className='uf-select' onClick={() => inputRef.current?.focus()}>
                            {target && !editing ? (
                                <button type='button' className='uf-selected' onClick={() => setEditing(true)}>
                                    <TargetRow target={target} variant='singleValue'/>
                                </button>
                            ) : (
                                <input
                                    ref={inputRef}
                                    autoFocus={true}
                                    placeholder='Select channel or people'
                                    value={term}
                                    onChange={(e) => {
                                        setTerm(e.target.value);
                                        setEditing(true);
                                    }}
                                    aria-label='Select channel or people'
                                />
                            )}
                            {menuOpen && (
                                <ul className='uf-menu'>
                                    {channels.length > 0 && <li className='uf-label'>{'Channels'}</li>}
                                    {channels.map((channel) => (
                                        <li key={channel.id}>
                                            <button type='button' onClick={() => select({kind: 'channel', channel})}>
                                                <TargetRow target={{kind: 'channel', channel}} variant='option'/>
                                            </button>
                                        </li>
                                    ))}
                                    {users.length > 0 && <li className='uf-label'>{'People'}</li>}
                                    {users.map((user) => (
                                        <li key={user.id}>
                                            <button type='button' onClick={() => select({kind: 'user', user})}>
                                                <TargetRow target={{kind: 'user', user}} variant='option'/>
                                            </button>
                                        </li>
                                    ))}
                                    {channels.length === 0 && users.length === 0 && <li className='uf-label'>{'No matches found'}</li>}
                                </ul>
                            )}
                        </div>
                    </div>
                    {copyMode && (
                        <div className='uf-note'>
                            <InfoIcon/>
                            <p>{COPY_WARNING}</p>
                        </div>
                    )}
                    <textarea
                        id='forward_post_textbox'
                        rows={1}
                        placeholder='Add a comment (optional)'
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <div className='forward-post__post-preview'>
                        <span className='forward-post__post-preview--title'>{'Message preview'}</span>
                        <div className='post forward-post__post-preview--override'>
                            <div className='attachment attachment--permalink'>
                                <div className='attachment__content attachment__content--permalink'>
                                    <div className='clearfix attachment__container attachment__container--permalink'>
                                        <div className='attachment__body__wrap attachment__body__wrap--permalink'>
                                            <div className='post-preview'>
                                                <div className='post-preview__header'>
                                                    <div className='col col__name'>
                                                        <div className='post__img'>
                                                            <span className='profile-icon'>
                                                                <img className='Avatar Avatar-sm avatar-post-preview' alt='' src={`/api/v4/users/${post.user_id}/image`}/>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className='col col__name permalink--username'>{author}</div>
                                                    <div className='col d-flex align-items-center'>
                                                        <span className='post-preview__time'>{relativeTime(post.create_at)}</span>
                                                    </div>
                                                </div>
                                                {post.message && (
                                                    <div className='post-message'>
                                                        <div className='post-message__text'>{post.message}</div>
                                                    </div>
                                                )}
                                                {sourceName && (
                                                    <div className='post__preview-footer'>
                                                        <p>{`Originally posted in ${sourceName}`}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {error && <label className='post-error'>{error}</label>}
                </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button type='button' className='GenericModal__button btn btn-tertiary' onClick={closeForward}>
                    {'Cancel'}
                </button>
                <button type='button' className='GenericModal__button btn btn-primary confirm' disabled={!target || sending} onClick={send}>
                    {'Forward'}
                </button>
            </Modal.Footer>
        </Modal>
    );
}
