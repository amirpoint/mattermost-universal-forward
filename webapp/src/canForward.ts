type MaybePost = {
    id?: string;
    type?: string;
    delete_at?: number;
    state?: string;
    pending_post_id?: string;
    failed?: boolean;
};

export function canForward(post: MaybePost | undefined): boolean {
    if (!post) {
        return false;
    }
    const pending = Boolean(post.pending_post_id) && post.pending_post_id === post.id;
    return !post.type && !post.delete_at && post.state !== 'DELETED' && !pending && !post.failed;
}
