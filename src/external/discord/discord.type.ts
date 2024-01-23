export enum ChannelId {
    NIKE_US = "1161659215530688532",
    US_NIKE_FRONTEND_BACKEND = "1068225788530413588",
    FOOTSITE_FRONTEND_MONITOR = "935311814558879835",
    FOOTSITE_MONITOR_CHECKOUT = "935311816094015608",
}

export interface DiscordMessage {
    id: string;
    title: string;
    sku: string;
    retailPrice: number;
    availableSizes: Record<number, SizeInfo>;
    date: number;
    imageUrl: string;
    isValid: boolean;
    stockXLink?: string;
    goatLink?: string;
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
