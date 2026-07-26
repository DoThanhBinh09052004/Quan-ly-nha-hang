import { Role } from "./role.model";

export interface User {
    id: number;
    username: string;
    password?: string;
    created: Date;
    updated: Date;
    deleted: boolean;
    // offDuty: boolean;
    roleId?: number;
    fullName?: string;
    shiftSalary?: number;
    role?: Role;
    
}
