// import { DiscordMessage } from "@external/discord/discord.type";
// import { SizeInfo } from "@external/discord/discord.type";

// const parsePlatformLinks = (links: string) => {
//   let i = 0;
//   let siteName = "";
//   let stockXLink;
//   let goatLink;

//   while (i < links.length) {
//     if (links[i] === "[") {
//       i += 1;
//       let currSiteName = "";
//       while (links[i] !== "]") {
//         currSiteName += links[i];
//         i += 1;
//       }
//       siteName = currSiteName;
//     } else if (links[i] === "(") {
//       i += 1;
//       let currLink = "";
//       while (links[i] !== ")") {
//         currLink += links[i];
//         i += 1;
//       }
//       if (siteName === "SX") {
//         stockXLink = currLink;
//       } else if (siteName === "Goat") {
//         goatLink = currLink;
//       }
//     }
//     i += 1;
//   }
//   return { stockXLink, goatLink };
// };

// const parseSizes = (sizeInfos: string[]): Record<number, SizeInfo> => {
//   let result: Record<number, SizeInfo> = {};

//   sizeInfos.forEach((sizeInfo) => {
//     let i = 0;
//     let currSize = "";
//     let currLink = "";
//     let currStock = "";
//     while (i < sizeInfo.length) {
//       if (sizeInfo[i] === "⎣") {
//         // parse size
//         i += 1;
//         while (sizeInfo[i] !== "⎦") {
//           currSize += sizeInfo[i];
//           i += 1;
//         }
//       }
//       if (sizeInfo[i] === "(") {
//         // parse link
//         i += 1;
//         while (sizeInfo[i] !== ")") {
//           currLink += sizeInfo[i];
//           i += 1;
//         }
//         if (!isNaN(Number(currSize))) {
//           result[Number(currSize)] = currLink;
//         }
//         currSize = "";
//         currLink = "";
//       }
//       i += 1;
//     }
//   });
//   return result;
// };

// const extractRetailPrice = (msg: string): number =>
//   Number(
//     msg
//       .split("|")
//       .find((x) => x.includes("USD"))
//       .split("USD")[0]
//   );

// const transformNikeUs = (json: any): DiscordMessage => {
//   const id = json.id;
//   const date = new Date(json.timestamp).getTime();
//   const embed = json.embeds[0];
//   const title = embed.title;

//   const fieldValues = embed.fields.map((f) => f.value);
//   const sku = fieldValues[0];
//   const platformLinks = fieldValues[1];
//   const sizesInfos = fieldValues.slice(
//     embed.fields.findIndex((f) => f.name === "Sizes") + 1,
//     fieldValues.length
//   );
//   const { stockXLink, goatLink } = parsePlatformLinks(platformLinks);
//   const availableSizes = parseSizes(sizesInfos);
//   return {
//     id,
//     title,
//     sku,
//     stockXLink,
//     retailPrice: extractRetailPrice(title),
//     goatLink,
//     availableSizes,
//     date,
//     imageUrl: "",
//     valid: true,
//   };
// };
