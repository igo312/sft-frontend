const createApiUrl = (url: string) => (`http://localhost:3001${url}`)

export const goatApi = {
    searchCatalog: (sku: string) => (createApiUrl(`/goat/catalog?query=${sku}`)),
    getPricingInsight: (catalogId: string) => (createApiUrl(`/goat/pricing/${catalogId}`)),
}
