export enum ChannelId {
    NIKE_US = "1161659215530688532",
    US_NIKE_FRONTEND_BACKEND = "1068225788530413588",
}

export interface DiscordMessage {
    id: string;
    title: string;
    sku: string;
    stockXLink: string;
    retailPrice: number;
    goatLink: string;
    availableSizes: Record<number, SizeInfo>;
    date: number;
    imageUrl: string;
    valid: boolean;
}

export type SizeInfo = {
    retailLink: string;
    stock: 'LOW' | 'MEDIUM' | 'HIGH' | 'N/A';
}

export interface DiscordTableData {
    id: string;
    title: string;
    sku: string;
    availableSizes: string;
    imageUrl: string;
    date: number;
}
