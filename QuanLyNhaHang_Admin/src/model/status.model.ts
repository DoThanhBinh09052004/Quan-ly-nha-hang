export interface Status {
    id: number;
    code?: string;
    name: string;
    description?: string;
    type?: string;
    created?: Date;
    updated?: Date;
    deleted?: boolean;
  }
  