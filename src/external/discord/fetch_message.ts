import { DiscordMessage, ChannelId } from "@external/discord/discord.type";

export async function fetchDiscordMessage(
  channelId: string
): Promise<DiscordMessage[] | undefined> {
  const headers = {
    authorization: process.env.REACT_APP_DISCORD_AUTH,
  };

  try {
    const response = await fetch(
      `https://discord.com/api/v8/channels/${channelId}/messages`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    const sortedResult = result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    let decodedResult;
    switch (channelId) {
      case ChannelId.NIKE_US:
        decodedResult = sortedResult
          .map((res) => decodeNikeUs(res))
          .filter(
            (res) =>
              Object.keys(res.availableSizes).length !== 0 &&
              !isNaN(res.retailPrice)
          );
        break;
      case ChannelId.US_NIKE_FRONTEND_BACKEND:
        decodedResult = sortedResult
          .map((res) => decodeUsNikeFrontendBackend(res))
          .filter((res) => res.valid === true);
        break;
      default:
        decodedResult = [];
    }
    return decodedResult;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return undefined;
  }
}

const decodeUsNikeFrontendBackend = (json: any): DiscordMessage => {
  const extractRetailPrice = (msg: string): number => {
    return Number(msg.split("USD")[0]);
  };

  const extractDiscountedPrice = (msg: string): number => {
    return Number(msg.split("(").slice(-1)[0].split("USD")[0]);
  };

  const parseSizes = (sizeInfo: string): number[] => {
    let result: number[] = [];
    let i = 0;
    let currSize = "";
    while (i < sizeInfo.length) {
      if (sizeInfo[i] === "[") {
        // parse size
        i += 1;
        while (!isNaN(Number(currSize + sizeInfo[i]))) {
          currSize += sizeInfo[i];
          i += 1;
        }
        result.push(Number(currSize));
      }
      if (sizeInfo[i] === ")") {
        // end of a size info
        // link is add to cart, not needed
        currSize = "";
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

  const id = json.id;
  const date = new Date(json.timestamp).getTime();
  const embed = json.embeds[0];
  const title = embed.title;
  const live = embed.description.toLowerCase().includes("live");
  const retailPrice = extractRetailPrice(embed.description);

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

  const availableSizes = {}
  fieldValues["availableSizes"].forEach(size => {availableSizes[size] = fieldValues["retailLink"]})

  return {
    id,
    title,
    sku: fieldValues["sku"],
    stockXLink: fieldValues["stockXLink"],
    goatLink: fieldValues["goatLink"],
    retailPrice: fieldValues["discountedPrice"]
      ? fieldValues["discountedPrice"]
      : retailPrice,
    availableSizes: availableSizes,
    date,
    valid: live && fieldValues["active"],
  };
};

const decodeNikeUs = (json: any): DiscordMessage => {
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
        if (siteName === "SX") {
          stockXLink = currLink;
        } else if (siteName === "Goat") {
          goatLink = currLink;
        }
      }
      i += 1;
    }
    return { stockXLink, goatLink };
  };

  const parseSizes = (sizeInfos: string[]): Record<number, string> => {
    let result: Record<number, string> = {};

    sizeInfos.forEach((sizeInfo) => {
      let i = 0;
      let currSize = "";
      let currLink = "";
      while (i < sizeInfo.length) {
        if (sizeInfo[i] === "⎣") {
          // parse size
          i += 1;
          while (sizeInfo[i] !== "⎦") {
            currSize += sizeInfo[i];
            i += 1;
          }
        }
        if (sizeInfo[i] === "(") {
          // parse link
          i += 1;
          while (sizeInfo[i] !== ")") {
            currLink += sizeInfo[i];
            i += 1;
          }
          if (!isNaN(Number(currSize))) {
            result[Number(currSize)] = currLink;
          }
          currSize = "";
          currLink = "";
        }
        i += 1;
      }
    });
    return result;
  };

  const extractRetailPrice = (msg: string): number =>
    Number(
      msg
        .split("|")
        .find((x) => x.includes("USD"))
        .split("USD")[0]
    );

  const id = json.id;
  const date = new Date(json.timestamp).getTime();
  const embed = json.embeds[0];
  const title = embed.title;

  const fieldValues = embed.fields.map((f) => f.value);
  const sku = fieldValues[0];
  const platformLinks = fieldValues[1];
  const sizesInfos = fieldValues.slice(
    embed.fields.findIndex((f) => f.name === "Sizes") + 1,
    fieldValues.length
  );
  const { stockXLink, goatLink } = parsePlatformLinks(platformLinks);
  const availableSizes = parseSizes(sizesInfos);
  return {
    id,
    title,
    sku,
    stockXLink,
    retailPrice: extractRetailPrice(title),
    goatLink,
    availableSizes,
    date,
    valid: true,
  };
};
