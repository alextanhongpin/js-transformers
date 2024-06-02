import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";
import * as wavefile from "https://cdn.jsdelivr.net/npm/wavefile@11.0.0/+esm";

// Skip local model check.
env.allowLocalModels = false;

const extractor = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2",
  { progress_callback: console.log },
);

self.onmessage = async (event) => {
  // event.data can be a single text, or an array of text.
  const output = await extractor(event.data, {
    pooling: "mean",
    normalize: true,
  });
  self.postMessage(output.tolist());
};
