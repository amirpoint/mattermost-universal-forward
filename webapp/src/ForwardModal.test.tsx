import '@testing-library/jest-dom';
import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

import * as api from './api';
import * as fwd from './forwardPost';
import ForwardModal from './ForwardModal';
import {closeForward, openForward} from './modalState';

jest.mock('./api');
jest.mock('./forwardPost');
const mApi = api as jest.Mocked<typeof api>;
const mFwd = fwd as jest.Mocked<typeof fwd>;

const post = {id: 'p1', channel_id: 'src', user_id: 'u9', message: 'hello', create_at: 1};
const channel = {id: 'c1', type: 'O', team_id: 't1', name: 'dev', display_name: 'Dev Team'};
const user = {id: 'u2', username: 'sara'};

async function search() {
    fireEvent.change(screen.getByPlaceholderText('Search channels or people'), {target: {value: 'de'}});
    return screen.findByText('Dev Team');
}

beforeEach(() => {
    jest.resetAllMocks();
    mApi.searchChannels.mockResolvedValue([channel]);
    mApi.searchUsers.mockResolvedValue([user]);
    mFwd.planForward.mockResolvedValue({mode: 'permalink', destChannelId: 'c1'});
    mFwd.forwardPost.mockResolvedValue({mode: 'permalink'});
    render(<ForwardModal/>);
    act(() => openForward(post));
});
afterEach(() => {
    act(() => closeForward());
});

describe('ForwardModal', () => {
    test('lists channel and user results for a search term', async () => {
        await search();
        expect(screen.getByText('@sara')).toBeInTheDocument();
    });
    test('Send stays disabled until a target is selected', async () => {
        expect(screen.getByRole('button', {name: 'Send'})).toBeDisabled();
        fireEvent.click(await search());
        await waitFor(() => expect(screen.getByRole('button', {name: 'Send'})).toBeEnabled());
    });
    test('shows the copy warning when the plan is copy', async () => {
        mFwd.planForward.mockResolvedValue({mode: 'copy', destChannelId: 'c1'});
        fireEvent.click(await search());
        expect(await screen.findByText('متن پیام کپی می‌شود (گیرنده به کانال مبدأ دسترسی ندارد)')).toBeInTheDocument();
    });
    test('Send forwards with the note and closes the modal', async () => {
        fireEvent.click(await search());
        fireEvent.change(screen.getByPlaceholderText('Add a note (optional)'), {target: {value: 'FYI'}});
        await waitFor(() => expect(screen.getByRole('button', {name: 'Send'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(mFwd.forwardPost).toHaveBeenCalledWith(post, {kind: 'channel', channel}, 'FYI', window.location.origin);
    });
    test('shows the server error and stays open when forwarding fails', async () => {
        mFwd.forwardPost.mockRejectedValue(new Error('no permission'));
        fireEvent.click(await search());
        await waitFor(() => expect(screen.getByRole('button', {name: 'Send'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        expect(await screen.findByText('no permission')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});
