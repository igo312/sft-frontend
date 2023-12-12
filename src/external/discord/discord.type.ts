export enum ChannelId {
    NIKE_US = "1161659215530688532",
}

export interface DiscordMessage {
    id: string;
    title: string;
    sku: string;
    stockXLink: string;
    retailPrice: number;
    goatLink: string;
    availableSizes: Record<number, string>;
    date: number;
}

export interface DiscordTableData {
    id: string;
    title: string;
    sku: string;
    retailPrice: number;
    stockXLink: string;
    goatLink: string;
    availableSizes: string;
    date: number;
}
