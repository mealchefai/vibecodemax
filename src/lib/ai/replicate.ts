import Replicate, { type FileOutput } from "replicate";

function getReplicateClient(): Replicate {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN environment variable is not set");
  }
  return new Replicate({ auth: apiToken });
}

function isFileOutput(value: unknown): value is FileOutput {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).blob === "function"
  );
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

  // SDK v1.x returns FileOutput (a ReadableStream subclass with .blob() and .url())
  // for image models. Handle both FileOutput and legacy plain-URL responses.
  const fileOutput = Array.isArray(output) ? output[0] : output;

  if (isFileOutput(fileOutput)) {
    const blob = await fileOutput.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Fallback: legacy string URL response
  if (typeof fileOutput === "string" && fileOutput.startsWith("http")) {
    const res = await fetch(fileOutput);
    if (!res.ok) {
      throw new Error(
        `Failed to download image from Replicate: ${res.status} ${res.statusText}`
      );
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error(
    `Replicate returned an unexpected output format: ${JSON.stringify(fileOutput)}`
  );
}
