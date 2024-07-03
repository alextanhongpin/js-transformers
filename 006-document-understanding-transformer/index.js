const Model = {
  worker: new Worker("./worker.js", { type: "module" }),
  state: {
    image: null,
  },
  setState(state) {
    this.state = {
      ...this.state,
      ...state,
    };
  },
  async pdfToImage(page) {
    const scale = 1.5;
    const viewport = page.getViewport({ scale: scale });
    // Support HiDPI-screens.
    const outputScale = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    const renderContext = {
      canvasContext: context,
      transform: transform,
      viewport: viewport,
    };
    await page.render(renderContext);
    //return context.getImageData(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL();
  },
};

const View = {
  textarea: document.getElementById("textarea"),
  out: document.getElementById("out"),
  file: document.getElementById("file"),
  button: document.getElementById("button"),

  render(text) {
    this.out.innerText = text;
  },

  disableButton(disabled) {
    this.button.innerText = disabled ? "Loading..." : "Submit";
    this.button.disabled = disabled;
  },
};

const Controller = {
  bindWorker() {
    Model.worker.onmessage = (event) => {
      View.disableButton(false);
      console.log("received:", event.data);
      const { status, error, output } = event.data;
      switch (status) {
        case "failed":
          View.render(error);
          return;
        case "success":
          View.render(output);
          break;
      }
    };
  },
  bindButton() {
    View.button.addEventListener("click", async () => {
      const image = Model.state.image;
      if (!image) {
        alert("Please upload an image");
        return;
      }

      const question = View.textarea.value;
      if (!question) {
        alert("Please enter a question");
        return;
      }

      const input = { image, question };
      console.log("sending", input);
      View.disableButton(true);
      Model.worker.postMessage(input);
    });
  },
  bindFile() {
    View.file.addEventListener("change", async (evt) => {
      const file = evt.target.files[0];
      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      const isSupported = isPDF || isImage;
      if (!isSupported) {
        alert("Please upload a PDF or image file");
        return;
      }

      if (isPDF) {
        const fileReader = new FileReader();
        fileReader.onload = async (evt) => {
          const arrayBuffer = evt.target.result;
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          const page = await pdf.getPage(1);
          const image = await Model.pdfToImage(page);
          Model.setState({ image });
        };
        fileReader.readAsArrayBuffer(file);
      } else {
        Model.setState({ image: URL.createObjectURL(file) });
      }
    });
  },
  init() {
    this.bindButton();
    this.bindFile();
    this.bindWorker();

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
  },
};

Controller.init();
