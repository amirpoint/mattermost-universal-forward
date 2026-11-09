import {Post} from './types';

let current: Post | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

export const openForward = (post: Post) => {
    current = post;
    notify();
};
export const closeForward = () => {
    current = null;
    notify();
};
export const getForwardPost = () => current;
export const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
