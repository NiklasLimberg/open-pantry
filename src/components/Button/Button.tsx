import * as Slot from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import styles from "./Button.module.css";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
  /** Render the child element (e.g. a router Link) with button styling. */
  asChild?: boolean;
};

export function Button({ variant = "primary", asChild = false, className, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={[styles.button, styles[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
