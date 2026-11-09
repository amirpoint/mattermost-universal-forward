import {canForward} from './canForward';
import ForwardModal from './ForwardModal';
import {openForward, setSiteUrl} from './modalState';

const PLUGIN_ID = 'com.example.universal-forward';

export default class Plugin {
    initialize(registry: any, store: any) {
        const getPost = (postId: string) => store.getState().entities.posts.posts[postId];
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
    }
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void;
    }
}

window.registerPlugin(PLUGIN_ID, new Plugin());
