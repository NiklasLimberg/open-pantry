import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

import styles from "./ScreenMock.module.css";

// Static, non-interactive renderings of the screens in docs/design/screens.html,
// using its sample data (fixed to 21 October 2026). They are pictures: screen readers get
// the caption instead of the contents, and nothing inside is focusable.

type FrameProps = {
  /** Describes the picture for screen readers. */
  label: string;
  variant?: "phone" | "panel";
  children: ReactNode;
  className?: string;
};

export function ScreenFrame({ label, variant = "panel", children, className }: FrameProps) {
  return (
    <figure className={[styles.frame, styles[variant], className].filter(Boolean).join(" ")}>
      <div className={styles.screen} aria-hidden="true">
        {children}
      </div>
      <figcaption className={styles.caption}>{label}</figcaption>
    </figure>
  );
}

function Quarters({ filled }: { filled: number }) {
  return (
    <span className={styles.quarters}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={n <= filled ? styles.filled : undefined} />
      ))}
    </span>
  );
}

function FakeButton({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <span className={[styles.button, primary && styles.primary].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

function Icon({ children }: { children: string }) {
  return <span className={styles.icon}>{children}</span>;
}

export function UseSoonCard({
  icon,
  name,
  location,
  dateType,
  when,
  date,
  amount,
}: {
  icon: string;
  name: string;
  location: string;
  dateType: string;
  when: string;
  date: string;
  amount: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.soonDate}>
        <span>{dateType}</span>
        <strong>{when}</strong>
        <time>{date}</time>
      </div>
      <div className={styles.product}>
        <Icon>{icon}</Icon>
        <div>
          <strong className={styles.name}>{name}</strong>
          <span className={styles.muted}>{location}</span>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span>{amount}</span>
        <FakeButton>{m["mock.updateAmount"]()}</FakeButton>
      </div>
    </div>
  );
}

export function MilkGroupCard() {
  return (
    <div className={styles.card}>
      <div className={styles.product}>
        <Icon>🥛</Icon>
        <div>
          <strong className={styles.name}>{m["mock.item.milk"]()}</strong>
          <span className={styles.muted}>{m["mock.milkMeta"]()}</span>
        </div>
      </div>
      <div className={styles.quantity}>
        <strong>{m["mock.milkAmount"]()}</strong>
        <span className={styles.muted}>{m["mock.approxRemaining"]()}</span>
      </div>
      <span className={styles.muted}>{m["mock.milkSplit"]()}</span>
      <div className={styles.batches}>
        <span className={styles.batchesTitle}>{m["mock.individualCartons"]()}</span>
        <div className={styles.batch}>
          <div className={styles.batchHead}>
            <strong>{m["mock.carton1"]()}</strong>
            <span className={styles.muted}>{m["global.opened"]()}</span>
          </div>
          <div className={styles.batchAmount}>
            <span>{m["mock.left.half"]()}</span>
            <Quarters filled={2} />
          </div>
          <div className={styles.batchHead}>
            <span className={styles.warnText}>{m["mock.mhdTomorrow"]()}</span>
            <FakeButton>{m["global.update"]()}</FakeButton>
          </div>
        </div>
        <div className={styles.batch}>
          <div className={styles.batchHead}>
            <strong>{m["mock.carton2"]()}</strong>
            <span className={styles.muted}>{m["global.unopened"]()}</span>
          </div>
          <div className={styles.batchAmount}>
            <span>{m["global.amount.full"]()}</span>
            <Quarters filled={4} />
          </div>
          <div className={styles.batchHead}>
            <span className={styles.muted}>{m["mock.mhd28oct"]()}</span>
            <FakeButton>{m["global.update"]()}</FakeButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StockCard({
  icon,
  name,
  meta,
  amount,
  quarters,
  date,
}: {
  icon: string;
  name: string;
  meta: string;
  amount: string;
  quarters?: number;
  date: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.product}>
        <Icon>{icon}</Icon>
        <div>
          <strong className={styles.name}>{name}</strong>
          <span className={styles.muted}>{meta}</span>
        </div>
      </div>
      <div className={styles.quantity}>
        <strong>{amount}</strong>
        <span className={styles.muted}>
          {quarters === undefined ? m["mock.remaining"]() : m["mock.remainingApprox"]()}
        </span>
      </div>
      {quarters !== undefined && <Quarters filled={quarters} />}
      <div className={styles.cardFooter}>
        <span className={styles.muted}>{date}</span>
        <FakeButton>{m["global.update"]()}</FakeButton>
      </div>
    </div>
  );
}

export function RuleCard({
  icon,
  name,
  criteria,
  sentence,
  have,
  progress,
  status,
}: {
  icon: string;
  name: string;
  criteria: string;
  sentence: string;
  have: string;
  /** 0–1 share of the target available. */
  progress: number;
  /** Shortage text, or undefined when covered. */
  status?: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.product}>
        <Icon>{icon}</Icon>
        <div>
          <strong className={styles.name}>{name}</strong>
          <span className={styles.muted}>{criteria}</span>
        </div>
      </div>
      <span>{sentence}</span>
      <span className={styles.progress}>
        <span style={{ width: `${Math.min(1, progress) * 100}%` }} />
      </span>
      <div className={styles.batchHead}>
        <span className={styles.small}>{have}</span>
        <span className={[styles.pill, status && styles.warn].filter(Boolean).join(" ")}>
          {status ?? m["mock.covered"]()}
        </span>
      </div>
    </div>
  );
}

export function ShoppingRow({
  name,
  detail,
  amount,
  checked,
}: {
  name: string;
  detail: string;
  amount: string;
  checked?: boolean;
}) {
  return (
    <div className={[styles.shoppingRow, checked && styles.checked].filter(Boolean).join(" ")}>
      <span className={styles.checkbox}>{checked ? "✓" : ""}</span>
      <div className={styles.shoppingText}>
        <strong>{name}</strong>
        <span className={styles.muted}>{detail}</span>
      </div>
      <strong className={styles.buyAmount}>{amount}</strong>
    </div>
  );
}

export function ScanSheet() {
  return (
    <div className={styles.sheet}>
      <div className={styles.viewfinder}>
        <span className={styles.barcode} />
        <span className={styles.small}>{m["mock.scanSheet.barcode"]()}</span>
      </div>
      <div className={styles.product}>
        <Icon>🥛</Icon>
        <div>
          <strong className={styles.name}>{m["mock.item.milk"]()}</strong>
          <span className={styles.muted}>{m["mock.scanSheet.meta"]()}</span>
        </div>
      </div>
      <span>{m["mock.scanSheet.question"]()}</span>
      <FakeButton primary>{m["mock.scanSheet.add"]()}</FakeButton>
      <FakeButton>{m["mock.scanSheet.updateOpened"]()}</FakeButton>
      <FakeButton>{m["mock.scanSheet.updateUnopened"]()}</FakeButton>
    </div>
  );
}

/** Mobile chrome: title bar on top, Scan button and bottom navigation below. */
export function PhoneScreen({
  title,
  active,
  children,
}: {
  title: string;
  active: "pantry" | "rules" | "shopping" | "settings";
  children: ReactNode;
}) {
  return (
    <div className={styles.phoneLayout}>
      <div className={styles.statusBar}>
        <span>{m["mock.phone.time"]()}</span>
        <span className={styles.sync}>
          <span className={styles.dot} />
          {m["mock.phone.upToDate"]()}
        </span>
      </div>
      <div className={styles.phoneBody}>
        <strong className={styles.phoneTitle}>{title}</strong>
        {children}
      </div>
      <span className={styles.fab}>{m["global.scan"]()}</span>
      <div className={styles.bottomNav}>
        {(
          [
            ["pantry", m["global.pantry"]()],
            ["rules", m["global.rules"]()],
            ["shopping", m["global.shopping"]()],
            ["settings", m["global.settings"]()],
          ] as const
        ).map(([key, label]) => (
          <span key={key} className={key === active ? styles.navActive : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
