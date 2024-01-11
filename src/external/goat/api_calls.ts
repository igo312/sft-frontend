import { goatApi } from "@external/goat/api.constants";
import {
  GoatCatalog,
  GoatPricing,
  GoatProductCondition,
  GoatPackageCondition,
} from "@external/goat/goat.types";

export const makeGoatApiCall = async (url: string) => {
  try {
    const response = await fetch(url, {
      method: "GET",
    });
    const resJson = await response.json();
    return resJson;
  } catch (error) {
    console.error("Error making goat API call: ", error);
  }
};

export const getGoatCatalogFromSku = async (
  sku: string
): Promise<GoatCatalog | undefined> => {
  const url = goatApi.searchCatalog(sku);
  const data = await makeGoatApiCall(url);
  return data[0]
    ? {
        catalogId: data[0].catalog_id,
        title: data[0].name,
        sku: data[0].sku,
        brand: data[0].brand,
      }
    : undefined;
};

export const getPricingInsight = async (
  catalogId: string
): Promise<GoatPricing[]> => {
  const url = goatApi.getPricingInsight(catalogId);
  const data = await makeGoatApiCall(url);
  return data
    .map((d) => ({
      size: d.size,
      condition: d.product_condition,
      packageCondition: d.packaging_condition,
      lowestListingPrice:
        Number(d.availability.lowest_listing_price_cents) / 100,
    }));
};
