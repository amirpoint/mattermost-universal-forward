import ForwardModal from './ForwardModal';
import {openForward} from './modalState';

const PLUGIN_ID = 'com.example.universal-forward';

export default class Plugin {
    initialize(registry: any, store: any) {
        const getPost = (postId: string) => store.getState().entities.posts.posts[postId];
        registry.registerRootComponent(ForwardModal);
        registry.registerPostDropdownMenuAction(
            'Forward to…',
            (postId: string) => {
                const post = getPost(postId);
                if (post) {
                    openForward(post);
                }
            },
            (postId: string) => {
                const post = getPost(postId);
                return Boolean(post) && !post.type && !post.delete_at;
            },
        );
    }
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void;
    }
}

window.registerPlugin(PLUGIN_ID, new Plugin());
