// https://github.com/xenova/transformers.js/blob/main/examples/demo-site/src/worker.js
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// Skip local model check.
env.allowLocalModels = false;

const models = {};

function load(task, model, progress_callback) {
  const key = `${task}:${model}`;
  if (models[key]) {
    return models[key];
  }

  models[key] = {
    status: "pending",
    queue: [],
  };

  pipeline(task, model, { progress_callback }).then((pipe) => {
    models[key].status = "success";
    models[key].pipe = pipe;
    models[key].do = async function ({ text, time }) {
      let output = await pipe(text);
      self.postMessage({
        status: "success", // To indicate that our task is done.
        text,
        time,
        output,
      });
    };

    // If there are any pending tasks, we run them now.
    // We only run the last item in the queue.
    console.log("checking queue...", models[key]);
    if (models[key].queue.length) {
      const last = models[key].queue.pop();
      delete models[key].queue;
      models[key].do(last);
    }
  });

  return models[key];
  // when progress
  // {
  //  status: "progress"", "file: "onnx/model_quantized.onnx",
  //  loaded: 631599,
  //  name : "Xenova/robertuito-sentiment-analysis",
  //  progress : 0.5739437294535475,
  //  total : 110045457
  //  }
  //
  // when ready
  // {status: 'ready', task: 'text-classification', model: "Xenova/robertuito-sentiment-analysis"}
  //
  // when done
  // {status: 'done', name: 'Xenova/robertuito-sentiment-analysis', file: 'onnx/model_quantized.onnx'}
}

function debounce(fun, duration = 250) {
  let timer = null;
  return function (...args) {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      fun(...args);
    }, duration);
  };
}

// We add debounce so that our worker doesn't get overwhelmed.
self.onmessage = debounce(async (event) => {
  console.log("worker:", event);

  const { data } = event;

  const { text, time } = data;

  const model = load(
    "sentiment-analysis",
    "Xenova/robertuito-sentiment-analysis",
    self.postMessage,
  );
  //const model = load("text-generation", "Xenova/Phi-3-mini-4k-instruct");
  //const model = load("text-generation", "Xenova/gpt2", self.postMessage);
  //const model = load("translation", "Xenova/opus-mt-en-jap", self.postMessage);

  if (model.status !== "success") {
    model.queue.push(data);
    console.log("initializing...");
    return;
  }

  console.log("done, running");
  await model.do({ text, time });
});
