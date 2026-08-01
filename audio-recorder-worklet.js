// Ney Meyar AudioWorklet v0.5.1
// © 2026 محمد الزهراني. جميع الحقوق محفوظة.

class NeyRecorderProcessor extends AudioWorkletProcessor {
  constructor(){
    super();

    this.preRollLength = Math.max(1,Math.round(sampleRate*0.25));
    this.preRoll = new Float32Array(this.preRollLength);
    this.preRollWrite = 0;
    this.preRollFilled = 0;
    this.capture = null;

    this.port.onmessage = event => {
      const data = event.data || {};

      if (data.type === "start"){
        this.startCapture(data.id,data.totalSamples);
        return;
      }

      if (data.type === "abort"){
        if (!this.capture || !data.id || data.id === this.capture.id){
          this.capture = null;
        }
      }
    };
  }

  orderedPreRoll(maxLength){
    const available = Math.min(this.preRollFilled,maxLength);
    if (available <= 0) return new Float32Array(0);

    const output = new Float32Array(available);
    const start =
      (this.preRollWrite-available+this.preRollLength)%this.preRollLength;

    for (let index=0;index<available;index++){
      output[index] = this.preRoll[(start+index)%this.preRollLength];
    }

    return output;
  }

  startCapture(id,totalSamples){
    const total = Math.max(1,Math.round(Number(totalSamples)||1));
    const samples = new Float32Array(total);
    const pre = this.orderedPreRoll(total);

    samples.set(pre,0);
    this.capture = {
      id,
      samples,
      offset:pre.length,
      total
    };

    this.port.postMessage({
      type:"started",
      id,
      preRollSamples:pre.length,
      totalSamples:total
    });

    if (this.capture.offset >= this.capture.total){
      this.finishCapture();
    }
  }

  writePreRoll(input){
    for (let index=0;index<input.length;index++){
      this.preRoll[this.preRollWrite] = input[index];
      this.preRollWrite = (this.preRollWrite+1)%this.preRollLength;
      this.preRollFilled = Math.min(
        this.preRollLength,
        this.preRollFilled+1
      );
    }
  }

  appendCapture(input){
    if (!this.capture) return;

    const remaining = this.capture.total-this.capture.offset;
    if (remaining <= 0){
      this.finishCapture();
      return;
    }

    const count = Math.min(remaining,input.length);
    this.capture.samples.set(
      input.subarray(0,count),
      this.capture.offset
    );
    this.capture.offset += count;

    if (this.capture.offset >= this.capture.total){
      this.finishCapture();
    }
  }

  finishCapture(){
    if (!this.capture) return;

    const completed = this.capture;
    this.capture = null;
    const buffer = completed.samples.buffer;

    this.port.postMessage({
      type:"complete",
      id:completed.id,
      samples:buffer
    },[buffer]);
  }

  process(inputs,outputs){
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (output) output.fill(0);

    if (input && input.length){
      // Capture first, then update pre-roll. This preserves exact continuity
      // between the stored pre-roll and the next render quantum.
      this.appendCapture(input);
      this.writePreRoll(input);
    }

    return true;
  }
}

registerProcessor("ney-recorder",NeyRecorderProcessor);
