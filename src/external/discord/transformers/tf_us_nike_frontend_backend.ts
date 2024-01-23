import { DiscordMessage } from "@external/discord/discord.type";

const extractRetailPrice = (msg: string): number => {
  return Number(msg.split("USD")[0]);
};

const extractDiscountedPrice = (msg: string): number => {
  return Number(msg.split("(").slice(-1)[0].split("USD")[0]);
};

const parseSizes = (sizeInfo: string): { size: number; stock: string }[] => {
  let result: { size: number; stock: string }[] = [];

  let i = 0;
  let currSize = "";
  let currStock = "";
  let bracketCount = 0;
  while (i < sizeInfo.length) {
    if (sizeInfo[i] === "[") {
      i += 1;
      bracketCount += 1;
      if (bracketCount === 1) {
        // parse size
        while (!isNaN(Number(currSize + sizeInfo[i]))) {
          currSize += sizeInfo[i];
          i += 1;
        }
      } else {
        // parse stock
        while (sizeInfo[i] !== "]") {
          currStock += sizeInfo[i];
          i += 1;
        }
      }
    }
    if (sizeInfo[i] === ")") {
      // end of a size info
      // link is add to cart, not needed
      result.push({
        size: Number(currSize),
        stock: currStock,
      });
      currSize = "";
      currStock = "";
      bracketCount = 0;
    }
    i += 1;
  }
  return result;
};

const extractRetailLink = (msg: string): string => {
  let link = "";
  let i = 0;
  while (i < msg.length) {
    if (msg[i] === "(") {
      // parse size
      i += 1;
      while (msg[i] != ")") {
        link += msg[i];
        i += 1;
      }
      if (link.includes("nike.com")) {
        return link;
      }
    }
    i += 1;
  }
  return "";
};

const parsePlatformLinks = (links: string) => {
  let i = 0;
  let siteName = "";
  let stockXLink;
  let goatLink;

  while (i < links.length) {
    if (links[i] === "[") {
      i += 1;
      let currSiteName = "";
      while (links[i] !== "]") {
        currSiteName += links[i];
        i += 1;
      }
      siteName = currSiteName;
    } else if (links[i] === "(") {
      i += 1;
      let currLink = "";
      while (links[i] !== ")") {
        currLink += links[i];
        i += 1;
      }
      if (siteName === "StockX") {
        stockXLink = currLink;
      } else if (siteName === "GOAT") {
        goatLink = currLink;
      }
    }
    i += 1;
  }
  return { stockXLink, goatLink };
};

export const transformUsNikeFrontendBackend = (json: any): DiscordMessage => {
  const id = json.id;
  const date = new Date(json.timestamp).getTime();
  const embed = json.embeds[0];
  const title = embed.title;
  const live = embed.description.toLowerCase().includes("live");
  const retailPrice = extractRetailPrice(embed.description);
  const imageUrl = embed.thumbnail.url;

  const fields = embed.fields;
  const fieldValues = {};
  fields.forEach((field) => {
    switch (field.name.toLowerCase()) {
      case "sku":
        fieldValues["sku"] = field.value;
        break;
      case "status":
        fieldValues["active"] = field.value.toLowerCase().includes("active");
        break;
      case "size [stock]":
        fieldValues["availableSizes"] = parseSizes(field.value);
        break;
      case "discount / promo / cod":
        const discountedPrice = extractDiscountedPrice(field.value);
        if (!isNaN(discountedPrice)) {
          fieldValues["discountedPrice"] = discountedPrice;
        }
        break;
      case "channel":
        fieldValues["retailLink"] = extractRetailLink(field.value);
        break;
      case "useful links":
        const platformLinks = parsePlatformLinks(field.value);
        fieldValues["stockXLink"] = platformLinks.stockXLink;
        fieldValues["goatLink"] = platformLinks.goatLink;
        break;
      default:
        break;
    }
  });

  const availableSizes = {};
  fieldValues["availableSizes"].forEach((sizeAndStock) => {
    const { size, stock } = sizeAndStock;
    availableSizes[size] = {
      retailLink: fieldValues["retailLink"],
      stock: stock === "" ? "N/A" : stock,
    };
  });

  return {
    id,
    title,
    sku: fieldValues["sku"],
    stockXLink: fieldValues["stockXLink"],
    goatLink: fieldValues["goatLink"],
    retailPrice: fieldValues["discountedPrice"]
      ? fieldValues["discountedPrice"]
      : retailPrice,
    availableSizes,
    date,
    imageUrl,
    isValid: live && fieldValues["active"],
  };
};

