// https://github.com/xenova/transformers.js/blob/main/examples/demo-site/src/worker.js
import {
  env,
  AutoTokenizer,
  AutoModelForSequenceClassification,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// Skip local model check.
env.allowLocalModels = false;

class Reranker {
  static modelId = null;
  static model = null;
  static tokenizer = null;
  static queue = [];
  static status = null;
  static error = null;

  static exec(input, options) {
    if (this.modelId === null) {
      throw new Error("Model must be set before calling getInstance");
    }

    switch (this.status) {
      case null:
        this.queue = [input];
        return this.init(options);
      case "pending":
        this.queue = [input];
        return;
      case "success":
        const { query, documents } = input;
        return this.rank(query, documents, options).then((scores) => {
          self.postMessage({
            input,
            output: scores,
          });
        });
      case "failed":
        return self.postMessage({
          input,
          error: this.error,
        });
    }
  }

  static async rank(
    query,
    documents,
    { top_k = documents.length, return_documents = true } = {},
  ) {
    console.log("rank", this.tokenizer, this.model);
    const inputs = this.tokenizer(new Array(documents.length).fill(query), {
      text_pair: documents,
      padding: true,
      truncation: true,
    });
    const { logits } = await this.model(inputs);
    return logits
      .sigmoid()
      .tolist()
      .map(([score], i) => ({
        corpus_id: i,
        score,
        ...(return_documents ? { text: documents[i] } : {}),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, top_k);
  }

  static init(options) {
    this.status = "pending";
    Promise.all([
      AutoModelForSequenceClassification.from_pretrained(this.modelId, {
        quantized: false,
      }),
      AutoTokenizer.from_pretrained(this.modelId),
    ])
      .then(([model, tokenizer]) => {
        this.model = model;
        this.tokenizer = tokenizer;
        this.status = "success";

        this.queue.length && this.exec(this.queue.pop(), options);
      })
      .catch((error) => {
        this.status = "failed";
        this.error = error;
      });
  }
}

class TextClassification extends Reranker {
  static modelId = "jinaai/jina-reranker-v1-turbo-en";
}

self.onmessage = async (event) => {
  console.log("worker:", event);

  const { data } = event;
  TextClassification.exec(data.input);
};
