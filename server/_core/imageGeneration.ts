import { storagePut } from "../storage";
import { ENV } from "./env";

export async function generateImage(options: { prompt: string; originalImages?: any[] }) {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new Error("Configuracao de API de imagem ausente");

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) throw new Error(`Falha na geracao: ${response.statusText}`);

  const result = await response.json();
  // Usamos globalThis.Buffer para garantir que o TS encontre a definicao do Node
  const buffer = globalThis.Buffer.from(result.image.b64Json, "base64");

  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, result.image.mimeType);
  return { url };
}