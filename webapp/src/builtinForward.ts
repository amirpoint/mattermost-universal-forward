const TEST_ID_PREFIX = 'forward_post_';

export function postIdFromBuiltinForward(testId: string | null | undefined): string | null {
    if (!testId?.startsWith(TEST_ID_PREFIX)) {
        return null;
    }
    const id = testId.slice(TEST_ID_PREFIX.length);
    return id || null;
}

// Mattermost's built-in Forward only lets a non-public post be shared back into its own
// channel. DMs, group messages, and private channels need the plugin dialog instead.
export function builtinForwardIsLocked(channelType: string | undefined): boolean {
    return Boolean(channelType) && channelType !== 'O';
}
