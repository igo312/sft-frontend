import { DiscordData } from "@discord/discord.type";

export async function fetchMessage(channelId: string) {
  const headers = {
    authorization:
      process.env.REACT_APP_DISCORD_AUTH,
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

    return sortedResult.map(res => decodeNikeUs(res));
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
}

const parseLinks = (links: string) => {
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

const decodeNikeUs = (json: any): DiscordData => {
  const id = json.id;
  const date = new Date(json.timestamp).getTime();
  const embed = json.embeds[0];
  const title = embed.title;

  const fieldValues = embed.fields.map((f) => f.value);
  const sku = fieldValues[0];
  const links = fieldValues[1];
  const { stockXLink, goatLink } = parseLinks(links);

  return {
    id,
    title,
    sku,
    stockXLink,
    goatLink,
    date,
  };
};
