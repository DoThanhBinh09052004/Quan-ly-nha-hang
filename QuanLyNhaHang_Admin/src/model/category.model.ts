export interface Category {
    id: number;
    name: string;
    parentId: number | null;
    description: string;
    created: Date;
    updated: Date;
    deleted: boolean;
}