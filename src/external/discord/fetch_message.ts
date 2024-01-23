import { DiscordMessage, ChannelId } from "@external/discord/discord.type";
import { transformUsNikeFrontendBackend } from "@external/discord/transformers/tf_us_nike_frontend_backend";

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
      case ChannelId.US_NIKE_FRONTEND_BACKEND:
        decodedResult = sortedResult
          .map((res) => transformUsNikeFrontendBackend(res))
          .filter((res) => res.valid === true);
        break;
      // case ChannelId.NIKE_US:
      //   decodedResult = sortedResult
      //     .map((res) => transformNikeUs(res))
      //     .filter(
      //       (res) =>
      //         Object.keys(res.availableSizes).length !== 0 &&
      //         !isNaN(res.retailPrice)
      //     );
      //   break;
      default:
        decodedResult = [];
    }
    
    const skuSet = new Set<string>();
    return decodedResult.filter((res) => {
      if (!skuSet.has(res.sku)) {
        skuSet.add(res.sku);
        return true;
      }
      return false;
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return undefined;
  }
}

