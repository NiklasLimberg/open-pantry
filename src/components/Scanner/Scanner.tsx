import { m } from "#/paraglide/messages.js";
import { useForm } from "@tanstack/react-form";
import { Camera, CameraOff } from "lucide-react";
import { z } from "zod";

import { normalizeBarcode } from "#/domains/products/barcode.ts";

import { Button } from "../Button/Button.tsx";
import { Field, Input } from "../Form/Form.tsx";
import styles from "./Scanner.module.css";
import { useCameraScan } from "./use-camera-scan.ts";

type Props = {
  onBarcode: (barcode: string) => void;
  /** Open the camera as soon as the scanner appears, when the user already asked to scan. */
  autoStart?: boolean;
};

/**
 * Camera scanning plus a typed-barcode field that is always available (denied permission,
 * unsupported browser, damaged label). Decoding happens on the device, so it works offline.
 * The camera starts when the user asks for it: with the button, or at once when `autoStart` says
 * pressing Scan already was the request.
 */
export function Scanner({ onBarcode, autoStart }: Props) {
  const { videoRef, ...camera } = useCameraScan(onBarcode, autoStart);

  return (
    <div className={styles.scanner}>
      <div className={styles.viewfinder} hidden={!camera.active}>
        <video ref={videoRef} className={styles.video} playsInline muted />
        <p className={styles.caption}>
          {camera.scanning ? m["scan.pointCamera"]() : m["scan.startingCamera"]()}
        </p>
      </div>
      {camera.error && (
        <p role="alert" className={styles.notice}>
          <CameraOff size={18} aria-hidden /> {camera.error}
        </p>
      )}
      {camera.active ? (
        <Button type="button" variant="secondary" onClick={camera.stop}>
          {m["scan.stopCamera"]()}
        </Button>
      ) : (
        <Button type="button" onClick={camera.start}>
          <Camera size={18} aria-hidden /> {m["scan.withCamera"]()}
        </Button>
      )}
      <TypedBarcode onBarcode={onBarcode} />
    </div>
  );
}

const barcodeSchema = z.object({
  barcode: z.string().refine((value) => normalizeBarcode(value) !== null, {
    error: () => m["scan.invalidBarcode"](),
  }),
});

function TypedBarcode({ onBarcode }: Props) {
  const form = useForm({
    defaultValues: { barcode: "" },
    validators: { onSubmit: barcodeSchema },
    onSubmit: ({ value }) => {
      const code = normalizeBarcode(value.barcode);
      if (code) onBarcode(code);
    },
  });

  return (
    <form
      className={styles.manual}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="barcode">
        {(field) => (
          <Field label={m["scan.orType"]()} htmlFor="barcode" errors={field.state.meta.errors}>
            <Input
              id="barcode"
              inputMode="numeric"
              autoComplete="off"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </Field>
        )}
      </form.Field>
      <Button type="submit" variant="secondary">
        {m["scan.useBarcode"]()}
      </Button>
    </form>
  );
}
