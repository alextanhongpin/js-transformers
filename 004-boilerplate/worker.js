// https://github.com/xenova/transformers.js/blob/main/examples/demo-site/src/worker.js
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// Skip local model check.
env.allowLocalModels = false;

class Pipeline {
  static instance = null;
  static queue = [];
  static status = "pending";
  static task = null;
  static model = null;
  static error = null;

  static getInstance(progress_callback) {
    if (this.task === null || this.model === null) {
      throw new Error("Task and model must be set before calling getInstance");
    }

    if (!this.instance) {
      this.instance = pipeline(this.task, this.model, { progress_callback })
        .then((pipe) => {
          this.status = "success";
          return pipe;
        })
        .catch((error) => {
          this.status = "failed";
          this.error = error;
        })
        .finally(() => {
          if (this.status === "success" && this.queue.length) {
            const last = this.queue.pop();
            delete this.queue;
            this.exec(last);
          }
        });
    }

    return this.instance;
  }

  static async exec(input, progress_callback) {
    console.log("executing input", input, this.status);
    switch (this.status) {
      case "success":
        const instance = await this.instance;
        console.log("in success", instance);
        self.postMessage({
          status: "success", // To indicate that our task is done.
          input,
          output: await instance(input),
        });
        break;
      case "pending":
        // Call lazily.
        this.queue = [input];
        this.getInstance(progress_callback);
        break;
      case "failed":
        self.postMessage({
          status: "failed", // To indicate that our task is done.
          input,
          output: null,
          error: this.error,
        });
        break;
    }
  }
}

class TextClassification extends Pipeline {
  static task = "text-classification";
  static model = "";
}

self.onmessage = async (event) => {
  console.log("worker:", event);

  const { data } = event;
  const { input } = data;

  TextClassification.exec(input, self.postMessage);
};
