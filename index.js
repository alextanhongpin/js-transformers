// https://xenova.github.io/transformers.js/
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";
import * as wavefile from "https://cdn.jsdelivr.net/npm/wavefile@11.0.0/+esm";

env.allowLocalModels = false;

measure("sentiment-analysis", async () => {
  throw new Error("skipping");
  // Allocate a pipeline for sentiment-analysis
  const pipe = await pipeline("sentiment-analysis");
  const result = await pipe(
    "this is a very bad article. not only did the author not do his research, but he also spread misinformation.",
  );
  console.log(JSON.stringify(result, null, 2));
});

measure("text2text-generation", async () => {
  throw new Error("skipping");

  const poet = await pipeline(
    "text2text-generation",
    "Xenova/LaMini-Flan-T5-783M",
  );
  const result = await poet("Write me a love poem about cheese.", {
    max_new_tokens: 200,
    temperature: 0.9,
    repetition_penalty: 2.0,
    no_repeat_ngram_size: 3,
  });
  console.log(JSON.stringify(result, null, 2));
});

measure("text-to-speech", async () => {
  const progress_callback = console.log;
  const synthetiser = await pipeline("text-to-speech", "Xenova/mms-tts-eng", {
    quantized: false,
    progress_callback,
  });
  const result = await synthetiser("this is a long text to be synthesized");
  const wav = new wavefile.WaveFile();
  wav.fromScratch(1, result.sampling_rate, "32f", result.audio);

  const audioElement = document.getElementById("audio");
  const blob = new Blob([wav.toBuffer()], { type: "audio/wav" });
  const audioURL = URL.createObjectURL(blob);
  audioElement.src = audioURL;
  audioElement.play();
  //console.log(JSON.stringify(result, null, 2));
});

// Load image
const file = document.getElementById("file");
file.onchange = async () => {
  const img = document.getElementById("img");
  img.src = URL.createObjectURL(file.files[0]);

  const pipe = await pipeline("image-classification");
  const result = await pipe(img.src);
  console.log(JSON.stringify(result, null, 2));
};

async function measure(msg, callback) {
  console.log(msg);
  const now = performance.now();
  await callback();
  console.log(`Time taken: ${performance.now() - now}ms`);
}
