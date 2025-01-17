export type Size = 'SMALL' | 'MEDIUM' | 'NO_COMPENSATION' | 'LARGE' | 'COMPETENCE_DEVELOPMENT';
export type Status = 'INITIAL' | 'PENDING' | 'ACCEPTED' | 'DECLINED';
export interface Contribution {
    id: string;
    timestamp: number;
    username: string;
    privateChannel: string;
    size: Size;
    status: Status;
    text: string;
}
