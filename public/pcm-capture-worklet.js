class XiantuPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    let readAt = 0;
    while (readAt < input.length) {
      const take = Math.min(input.length - readAt, this.buffer.length - this.offset);
      this.buffer.set(input.subarray(readAt, readAt + take), this.offset);
      this.offset += take;
      readAt += take;
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(2048);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("xiantu-pcm-capture", XiantuPcmCaptureProcessor);
