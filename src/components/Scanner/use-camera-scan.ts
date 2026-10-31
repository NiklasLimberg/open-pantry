import { m } from "#/paraglide/messages.js";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { createDecoder } from "#/domains/products/barcode-decoder.ts";

const scanIntervalMs = 200;

type CameraState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "unavailable"; message: string };

function describeFailure(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return m["scan.cameraDenied"]();
  }
  return error instanceof Error ? error.message : m["scan.cameraFailed"]();
}

/**
 * Opens the rear camera into `videoRef` once `start` is called and reports the first barcode it
 * reads. Decoding happens on the device; frames never leave the browser. Stopping, or unmounting,
 * releases the camera.
 */
export function useCameraScan(onBarcode: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<CameraState>({ kind: "idle" });
  const found = useEffectEvent(onBarcode);

  // Keyed on this flag, not on camera.kind: the starting -> scanning change must not restart the
  // effect, because its cleanup stops the camera stream.
  const active = camera.kind === "starting" || camera.kind === "scanning";

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function run() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(m["scan.cameraUnsupported"]());
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (stopped || !video) return;
        video.srcObject = stream;
        await video.play();
        const decoder = await createDecoder();
        if (stopped) return;
        setCamera({ kind: "scanning" });

        const tick = async () => {
          if (stopped) return;
          const code = video.readyState >= 2 ? await decoder.decode(video).catch(() => null) : null;
          if (stopped) return;
          if (code) return found(code);
          timer = setTimeout(tick, scanIntervalMs);
        };
        void tick();
      } catch (error) {
        if (!stopped) setCamera({ kind: "unavailable", message: describeFailure(error) });
      }
    }
    void run();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active]);

  return {
    videoRef,
    active,
    scanning: camera.kind === "scanning",
    error: camera.kind === "unavailable" ? camera.message : null,
    start: () => setCamera({ kind: "starting" }),
    stop: () => setCamera({ kind: "idle" }),
  };
}
