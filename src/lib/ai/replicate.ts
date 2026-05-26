import Replicate from "replicate";

function getReplicateClient(): Replicate {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN environment variable is not set");
  }
  return new Replicate({ auth: apiToken });
}

export async function generateMealImage(
  name: string,
  description: string
): Promise<Buffer> {
  const client = getReplicateClient();

  const prompt = `A professional overhead food photograph of ${name}, ${description}, on a clean white plate, natural lighting, restaurant quality`;

  const output = await client.run("black-forest-labs/flux-schnell", {
    input: { prompt },
  });

  // flux-schnell returns a URL string or an array of URL strings
  const imageUrl = Array.isArray(output) ? output[0] : output;

  if (typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
    throw new Error(
      `Replicate returned an unexpected output format: ${JSON.stringify(imageUrl)}`
    );
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to download image from Replicate: ${res.status} ${res.statusText}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
