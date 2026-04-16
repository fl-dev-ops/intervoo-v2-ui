import { useEffect, useRef, useState } from "react";
import { type AgentState } from "@livekit/components-react";

function generateConnectingSequenceBar(columns: number): number[][] {
  const sequence: number[][] = [];

  for (let x = 0; x < columns; x += 1) {
    sequence.push([x, columns - 1 - x]);
  }

  return sequence;
}

function generateListeningSequenceBar(columns: number): number[][] {
  const center = Math.floor(columns / 2);
  const noIndex = -1;

  return [[center], [noIndex]];
}

export function useAgentAudioVisualizerBarAnimator(
  state: AgentState | undefined,
  columns: number,
  interval: number,
): number[] {
  const [index, setIndex] = useState(0);
  const [sequence, setSequence] = useState<number[][]>([[]]);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (state === "thinking") {
      setSequence(generateListeningSequenceBar(columns));
    } else if (state === "connecting" || state === "initializing") {
      setSequence(generateConnectingSequenceBar(columns));
    } else if (state === "listening") {
      setSequence(generateListeningSequenceBar(columns));
    } else if (state === undefined || state === "speaking") {
      setSequence([Array.from({ length: columns }, (_, sequenceIndex) => sequenceIndex)]);
    } else {
      setSequence([[]]);
    }

    setIndex(0);
  }, [columns, state]);

  useEffect(() => {
    let startTime = performance.now();

    const animate = (time: DOMHighResTimeStamp) => {
      const timeElapsed = time - startTime;

      if (timeElapsed >= interval) {
        setIndex((previous) => previous + 1);
        startTime = time;
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [columns, interval, sequence.length, state]);

  return sequence[index % sequence.length] ?? [];
}
