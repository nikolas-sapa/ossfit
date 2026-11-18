import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2"; // ONNX mirror of all-MiniLM-L6-v2, 384-dim
const MAX_INPUT_CHARS = 2000; // README bodies can be huge; model truncates at 256 tokens anyway

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function loadExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractorPromise === null) {
    // First call downloads the model into the HF cache; reset on failure so callers can retry.
    extractorPromise = pipeline("feature-extraction", MODEL_ID).catch((err: unknown) => {
      extractorPromise = null;
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`embedding model unavailable (${MODEL_ID}): ${detail}`);
    });
  }
  return extractorPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await loadExtractor();
  const input = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
  const output = await extractor(input, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    out.push(await embedText(text));
  }
  return out;
}
