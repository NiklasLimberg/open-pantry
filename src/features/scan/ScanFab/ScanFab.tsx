import { m } from "#/paraglide/messages.js";
import { ScanBarcode, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import { ScanFlow } from "#/features/scan/ScanFlow/ScanFlow.tsx";
import styles from "./ScanFab.module.css";

/**
 * Floating Scan button that opens the scan flow in a dialog over the current page. Closing the
 * dialog unmounts the flow, which also stops the camera and resets the form.
 */
export function ScanFab({ onAdded }: { onAdded: (productId: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={styles.fab} aria-label={m["scan.open"]()}>
        <ScanBarcode size={24} aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <header className={styles.header}>
            <Dialog.Title className={styles.title}>{m["scan.open"]()}</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label={m["global.close"]()}>
              <X size={20} aria-hidden />
            </Dialog.Close>
          </header>
          <div className={styles.body}>
            <ScanFlow
              onAdded={(productId) => {
                setOpen(false);
                onAdded(productId);
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
