import {builtinForwardIsLocked, postIdFromBuiltinForward} from './builtinForward';
import {canForward} from './canForward';
import ForwardModal from './ForwardModal';
import {openForward, setSiteUrl} from './modalState';

const PLUGIN_ID = 'com.example.universal-forward';

export default class Plugin {
    initialize(registry: any, store: any) {
        const getPost = (postId: string) => store.getState().entities.posts.posts[postId];
        const getChannel = (channelId: string) => store.getState().entities.channels.channels[channelId];
        setSiteUrl(store.getState().entities.general?.config?.SiteURL || window.location.origin);
        registry.registerRootComponent(ForwardModal);
        registry.registerPostDropdownMenuAction(
            'Forward to…',
            (postId: string) => {
                const post = getPost(postId);
                if (post) {
                    openForward(post);
                }
            },
            (postId: string) => canForward(getPost(postId)),
        );

        // On 10.5 the "..." menu renders Mattermost's own Forward item and ignores
        // plugin dropdown actions. Take that click for DMs and private channels,
        // where the built-in dialog refuses any other destination.
        document.addEventListener('click', (event) => {
            const target = event.target as Element | null;
            const item = target?.closest?.('[data-testid^="forward_post_"]');
            if (!item) {
                return;
            }
            const postId = postIdFromBuiltinForward(item.getAttribute('data-testid'));
            if (!postId) {
                return;
            }
            const post = getPost(postId);
            const channel = post ? getChannel(post.channel_id) : undefined;
            if (!post || !builtinForwardIsLocked(channel?.type) || !canForward(post)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            openForward(post);
            const backdrop = item.closest('.MuiPopover-root')?.querySelector<HTMLElement>('.MuiBackdrop-root');
            window.setTimeout(() => backdrop?.click(), 0);
        }, true);
    }
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void;
    }
}

window.registerPlugin(PLUGIN_ID, new Plugin());
