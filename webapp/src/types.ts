export type Channel = {id: string; type: string; team_id: string; name: string; display_name: string};
export type User = {id: string; username: string};
export type Post = {id: string; channel_id: string; user_id: string; message: string; create_at: number};
export type Team = {id: string; name: string};
