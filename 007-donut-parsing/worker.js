// https://github.com/xenova/transformers.js/blob/main/examples/demo-site/src/worker.js
import {
  env,
  pipeline,
  //} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";
} from "../node_modules/@xenova/transformers/dist/transformers.min.js";

// Skip local model check.
env.allowLocalModels = false;

class Pipeline {
  constructor(task, model) {
    if (!task) throw new Error("task is required");
    this.task = task;

    if (!model) throw new Error("model is required");
    this.model = model;

    this.status = null;
    this.error = null;
    this.pipeline = null;
    this.queue = [];
  }

  async send(input) {
    switch (this.status) {
      case "success":
        //const image =
        //"https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/invoice.png";
        //const question = "What is the invoice number?";
        console.log("input", input);
        //const prompt = "<s_cord-v2>";
        //return this.pipeline(input, prompt);
        return this.pipeline(input);
      case "pending":
        this.queue = [input];
        return;
      case "failed":
        throw this.error;
      default:
        this.status = "pending";
        this.queue = [input];

        try {
          this.pipeline = await pipeline(this.task, this.model);
          this.status = "success";
        } catch (error) {
          this.error = error;
          this.status = "failed";
        } finally {
          return this.queue.length && this.send(this.queue.pop());
        }
    }
  }
}

let instance = null;

self.onmessage = async (event) => {
  console.log("received", event.data);
  const input = event.data;

  instance ??= new Pipeline(
    "image-to-text",
    //"Xenova/donut-base-finetuned-cord-v2",
    //"Xenova/trocr-base-printed",
    "Xenova/trocr-small-printed",
  );

  try {
    const output = await instance.send(input);
    console.table(output);
    if (!output) return;

    self.postMessage({
      status: "success",
      input,
      output,
    });
  } catch (error) {
    self.postMessage({
      status: "failed",
      input,
      error,
    });
  }
};
