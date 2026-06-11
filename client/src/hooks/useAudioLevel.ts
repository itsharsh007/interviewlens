import { useEffect, useState } from "react";

/** RMS level (0..1) of the mic track of a MediaStream, for the live audio bar. */
export function useAudioLevel(stream: MediaStream | null, active: boolean): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || !active || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSquares += v * v;
      }
      // Scale RMS up a bit so normal speech fills most of the bar.
      setLevel(Math.min(1, Math.sqrt(sumSquares / data.length) * 4));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void audioContext.close();
      setLevel(0);
    };
  }, [stream, active]);

  return level;
}
