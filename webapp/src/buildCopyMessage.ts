const MAX_LENGTH = 16383;

type Input = {
    message: string;
    username: string;
    channelName: string;
    createAt: number;
    fileNames: string[];
    note?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A zero-width space after "@" stops every mention (user, group, @channel/@all/@here) from notifying.
const neutralizeMentions = (text: string) => text.replace(/@(?=\w)/g, '@​');

const quote = (text: string) => text.split('\n').map((line) => `> ${line}`).join('\n');

export function buildCopyMessage(input: Input): string {
    const source = neutralizeMentions(`فوروارد از @${input.username} در ${input.channelName}، ${formatDate(input.createAt)}`);
    const files = input.fileNames.length ? input.fileNames.join(', ') : '';
    const head = input.note ? `${input.note}\n` : '';

    const assemble = (quoted: string) => [head.trimEnd(), quoted, files, source].filter(Boolean).join('\n');

    const text = neutralizeMentions(input.message);
    if (!text.trim()) {
        return assemble('');
    }

    let keep = text.length;
    let result = assemble(quote(text));
    while (result.length > MAX_LENGTH && keep > 0) {
        keep = Math.max(0, keep - (result.length - MAX_LENGTH) - 1);
        result = assemble(quote(`${text.slice(0, keep)}…`));
    }
    return result;
}
