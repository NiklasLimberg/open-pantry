import { normalizeScannedBarcode } from "./barcode.ts";

// Client-only. Decodes retail barcodes from camera frames entirely on the device; frames are never
// uploaded. Uses the native BarcodeDetector where it supports the retail formats and otherwise a
// bundled WebAssembly decoder (zxing-wasm), which the service worker precaches (vite.config.ts), so it also works offline.

type Frame = HTMLVideoElement;

export type Decoder = {
  kind: "native" | "wasm";
  /** Returns a valid, normalized barcode found in the frame, or null. */
  decode: (frame: Frame) => Promise<string | null>;
};

const nativeFormats = ["ean_13", "ean_8", "upc_a", "upc_e"];

const wasmToNativeFormat: Record<string, string> = {
  EAN13: "ean_13",
  EAN8: "ean_8",
  UPCA: "upc_a",
  UPCE: "upc_e",
};

declare global {
  // BarcodeDetector is not in lib.dom.d.ts yet.
  class BarcodeDetector {
    constructor(options?: { formats?: string[] });
    static getSupportedFormats(): Promise<string[]>;
    detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
  }
}

async function createNativeDecoder(): Promise<Decoder | null> {
  if (!("BarcodeDetector" in globalThis)) return null;
  try {
    const supported = await BarcodeDetector.getSupportedFormats();
    const formats = nativeFormats.filter((format) => supported.includes(format));
    if (formats.length === 0) return null;
    const detector = new BarcodeDetector({ formats });
    return {
      kind: "native",
      async decode(frame) {
        for (const found of await detector.detect(frame)) {
          const code = normalizeScannedBarcode(found.rawValue, found.format);
          if (code) return code;
        }
        return null;
      },
    };
  } catch {
    return null;
  }
}

async function createWasmDecoder(): Promise<Decoder> {
  const [{ prepareZXingModule, readBarcodes }, { default: wasmUrl }] = await Promise.all([
    import("zxing-wasm/reader"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  // Serve the decoder from our own origin instead of the default CDN so it can be cached offline.
  await prepareZXingModule({
    overrides: { locateFile: (path: string) => (path.endsWith(".wasm") ? wasmUrl : path) },
    fireImmediately: true,
  });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return {
    kind: "wasm",
    async decode(frame) {
      if (!context || !frame.videoWidth) return null;
      const scale = Math.min(1, 800 / frame.videoWidth);
      canvas.width = Math.round(frame.videoWidth * scale);
      canvas.height = Math.round(frame.videoHeight * scale);
      context.drawImage(frame, 0, 0, canvas.width, canvas.height);
      const results = await readBarcodes(context.getImageData(0, 0, canvas.width, canvas.height), {
        formats: ["EAN13", "EAN8", "UPCA", "UPCE"],
        maxNumberOfSymbols: 1,
        tryHarder: true,
      });
      for (const result of results) {
        if (!result.isValid) continue;
        const code = normalizeScannedBarcode(result.text, wasmToNativeFormat[result.format]);
        if (code) return code;
      }
      return null;
    },
  };
}

export async function createDecoder(): Promise<Decoder> {
  return (await createNativeDecoder()) ?? createWasmDecoder();
}
