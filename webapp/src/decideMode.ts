export type Mode = 'permalink' | 'copy';

export type Dest =
    | {kind: 'dm'; userIsSourceMember: boolean}
    | {kind: 'channel'; teamId: string};

export function decideMode(source: {type: string; teamId: string}, dest: Dest): Mode {
    if (dest.kind === 'dm') {
        return dest.userIsSourceMember ? 'permalink' : 'copy';
    }
    return source.type === 'O' && source.teamId === dest.teamId ? 'permalink' : 'copy';
}
