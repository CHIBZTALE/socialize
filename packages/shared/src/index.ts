export type SocializeUser = { id:string; name:string; username:string; email?:string; bio?:string; avatarUrl?:string|null };
export type SocializePost = { id:string; text:string; createdAt:string; author:Pick<SocializeUser,'id'|'name'|'username'|'avatarUrl'> };
