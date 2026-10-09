export let audioCtx: AudioContext | null = null;
export let analyser: AnalyserNode | null = null;
let timeData: Float32Array | null = null;

export function initAudio() {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.warn("getUserMedia non supporté");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);

      // Filtre bruits parasites aigus
      const biquadFilter = audioCtx.createBiquadFilter();
      biquadFilter.type = "lowpass";
      biquadFilter.frequency.value = 800;

      source.connect(biquadFilter);

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      biquadFilter.connect(analyser);

      timeData = new Float32Array(analyser.fftSize);

      // Visualiseur oscilloscope
      const canvasvisualizer = document.querySelector<HTMLCanvasElement>(".visualizer");
      if (!canvasvisualizer) return;
      const canvasCtx = canvasvisualizer.getContext("2d");
      if (!canvasCtx) return;

      canvasvisualizer.width = canvasvisualizer.clientWidth || 300;
      canvasvisualizer.height = 100;

      const drawWaveform = () => {
        requestAnimationFrame(drawWaveform);
        if (!analyser || !canvasCtx) return;

        analyser.getFloatTimeDomainData(timeData!);

        canvasCtx.fillStyle = "#DDD894";
        canvasCtx.fillRect(0, 0, canvasvisualizer.width, canvasvisualizer.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "#572F00";
        canvasCtx.beginPath();

        const sliceWidth = canvasvisualizer.width / timeData!.length;
        let x = 0;

        for (let i = 0; i < timeData!.length; i++) {
          const v = (timeData![i] + 1) / 2;
          const y = v * canvasvisualizer.height;
          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
          x += sliceWidth;
        }

        canvasCtx.stroke();
      };

      drawWaveform();
    })
    .catch((err) => {
      console.error("Erreur micro:", err);
    });
}

// Algorithme d'autocorrélation pour détecter la vraie note en Hertz
export function getPitch(): { pitchHz: number; volume: number } {
  if (!analyser || !timeData || !audioCtx) {
    return { pitchHz: -1, volume: 0 };
  }

  analyser.getFloatTimeDomainData(timeData);

  let sumSquares = 0;
  for (let i = 0; i < timeData.length; i++) {
    sumSquares += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(sumSquares / timeData.length);
  const volume = Math.min(100, Math.round(rms * 400));

  if (rms < 0.015) {
    return { pitchHz: -1, volume };
  }

  const sampleRate = audioCtx.sampleRate;
  const minPeriod = Math.floor(sampleRate / 600); 
  const maxPeriod = Math.floor(sampleRate / 80);

  let bestPeriod = -1;
  let bestCorrelation = 0;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    for (let i = 0; i < timeData.length - period; i++) {
      correlation += timeData[i] * timeData[i + period];
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestPeriod > 0) {
    const pitchHz = Math.round(sampleRate / bestPeriod);
    return { pitchHz, volume };
  }

  return { pitchHz: -1, volume };
}