export interface GoatCatalog {
  catalogId: string;
  title: string;
  sku: string;
  brand: string;
}

export interface GoatCatalogTableData {
  sku: string;
  imageUrl: string;
  size: number;
  title: string;
  cost: number;
  sellingPrice: number;
  profit: number;
  stock: string;
  retailLink: string;
  discordMessageDate: number;
}

export enum GoatProductCondition {
  NEW = "PRODUCT_CONDITION_NEW",
  USED = "PRODUCT_CONDITION_USED",
  NEW_WITH_DEFECT = "PRODUCT_CONDITION_NEW_WITH_DEFECTS",
}

export enum GoatPackageCondition {
  MISSING_LID = "PACKAGING_CONDITION_MISSING_LID",
  NO_ORIGINAL_BOX = "PACKAGING_CONDITION_NO_ORIGINAL_BOX",
  GOOD = "PACKAGING_CONDITION_GOOD_CONDITION",
  BAD = "PACKAGING_CONDITION_BADLY_DAMAGED",
}

export interface GoatPricing {
  size: number;
  condition: GoatProductCondition;
  packageCondition: GoatPackageCondition;
  lowestListingPrice: number;
}
