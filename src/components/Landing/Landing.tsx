import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

import { Button } from "../Button/Button.tsx";
import {
  MilkGroupCard,
  PhoneScreen,
  RuleCard,
  ScanSheet,
  ScreenFrame,
  ShoppingRow,
  StockCard,
  UseSoonCard,
} from "../ScreenMock/ScreenMock.tsx";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle.tsx";
import styles from "./Landing.module.css";

/** Where the main call to action leads, depending on the visitor. */
export type LandingCta = "pantry" | "setup" | "sign-in";

const ctaLinks = {
  pantry: { to: "/pantry", label: () => m["landing.cta.pantry"]() },
  setup: { to: "/setup", label: () => m["landing.cta.setup"]() },
  "sign-in": { to: "/sign-in", label: () => m["landing.cta.signIn"]() },
} as const;

function CtaButton({ cta, className }: { cta: LandingCta; className?: string }) {
  const { to, label } = ctaLinks[cta];
  return (
    <Button asChild className={className}>
      <Link to={to}>{label()}</Link>
    </Button>
  );
}

export function Landing({ cta }: { cta: LandingCta }) {
  return (
    <div className={styles.landing}>
      <header className={styles.nav}>
        <span className={styles.brand}>
          Open <b>Pantry</b>
        </span>
        <div className={styles.navActions}>
          <ThemeToggle />
          <CtaButton cta={cta} className={styles.navCta} />
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>{m["landing.hero.eyebrow"]()}</p>
            <h1 className={styles.heroTitle}>{m["landing.hero.title"]()}</h1>
            <p className={styles.lead}>{m["landing.hero.lead"]()}</p>
            <div className={styles.heroActions}>
              <CtaButton cta={cta} />
              <Button asChild variant="secondary">
                <a href="#features">{m["landing.hero.seeScreens"]()}</a>
              </Button>
            </div>
          </div>
          <ScreenFrame
            variant="phone"
            className={styles.heroPhone}
            label={m["landing.hero.caption"]()}
          >
            <PhoneScreen title={m["global.pantry"]()} active="pantry">
              <div className={styles.phoneSection}>
                <strong>{m["landing.hero.useSoon"]()}</strong>
                <span>{m["landing.hero.useSoonMeta"]()}</span>
              </div>
              <UseSoonCard
                icon="🍞"
                name={m["mock.item.sourdough"]()}
                location={m["mock.place.cupboard"]()}
                dateType={m["global.dateKind.mhd"]()}
                when={m["mock.tomorrow"]()}
                date={m["mock.date22oct"]()}
                amount={m["mock.left.slices3"]()}
              />
              <div className={styles.phoneSection}>
                <strong>{m["landing.hero.inventory"]()}</strong>
                <span>{m["landing.hero.inventoryMeta"]()}</span>
              </div>
              <MilkGroupCard />
            </PhoneScreen>
          </ScreenFrame>
        </section>

        <div id="features" className={styles.features}>
          <Feature
            eyebrow={m["landing.features.useSoon.eyebrow"]()}
            title={m["landing.features.useSoon.title"]()}
            body={
              <>
                <p>{m["landing.features.useSoon.body1"]()}</p>
                <p>{m["landing.features.useSoon.body2"]()}</p>
              </>
            }
          >
            <ScreenFrame label={m["landing.features.useSoon.caption"]()}>
              <UseSoonCard
                icon="🍞"
                name={m["mock.item.sourdough"]()}
                location={m["mock.place.cupboard"]()}
                dateType={m["global.dateKind.mhd"]()}
                when={m["mock.tomorrow"]()}
                date={m["mock.date22oct"]()}
                amount={m["mock.left.slices3"]()}
              />
              <UseSoonCard
                icon="🥛"
                name={m["mock.item.milk"]()}
                location={m["mock.place.fridge"]()}
                dateType={m["global.dateKind.mhd"]()}
                when={m["mock.tomorrow"]()}
                date={m["mock.date22oct"]()}
                amount={m["mock.left.halfOpened"]()}
              />
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow={m["landing.features.inventory.eyebrow"]()}
            title={m["landing.features.inventory.title"]()}
            body={
              <>
                <p>{m["landing.features.inventory.body1"]()}</p>
                <p>{m["landing.features.inventory.body2"]()}</p>
              </>
            }
            reverse
          >
            <ScreenFrame
              className={styles.cardGrid}
              label={m["landing.features.inventory.caption"]()}
            >
              <StockCard
                icon="☕"
                name={m["mock.item.coffee"]()}
                meta={m["mock.coffeeMeta"]()}
                amount={m["mock.coffeeAmount"]()}
                quarters={3}
                date={m["mock.coffeeDate"]()}
              />
              <StockCard
                icon="🍚"
                name={m["mock.item.rice"]()}
                meta={m["mock.riceMeta"]()}
                amount={m["global.amount.threeQuarters"]()}
                quarters={3}
                date={m["mock.riceDate"]()}
              />
              <StockCard
                icon="🍞"
                name={m["mock.item.sourdough"]()}
                meta={m["mock.riceMeta"]()}
                amount={m["mock.breadSlices"]()}
                date={m["mock.breadDate"]()}
              />
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow={m["landing.features.rules.eyebrow"]()}
            title={m["landing.features.rules.title"]()}
            body={<p>{m["landing.features.rules.body"]()}</p>}
          >
            <ScreenFrame label={m["landing.features.rules.caption"]()}>
              <RuleCard
                icon="🍞"
                name={m["mock.rule.bread.name"]()}
                criteria={m["mock.rule.bread.criteria"]()}
                sentence={m["mock.rule.bread.sentence"]()}
                have={m["mock.rule.bread.have"]()}
                progress={3 / 4}
                status={m["mock.rule.bread.status"]()}
              />
              <RuleCard
                icon="🥛"
                name={m["mock.rule.milk.name"]()}
                criteria={m["mock.rule.milk.criteria"]()}
                sentence={m["mock.rule.milk.sentence"]()}
                have={m["mock.rule.milk.have"]()}
                progress={1.5 / 2}
                status={m["mock.rule.milk.status"]()}
              />
              <RuleCard
                icon="☕"
                name={m["mock.rule.coffee.name"]()}
                criteria={m["mock.rule.coffee.criteria"]()}
                sentence={m["mock.rule.coffee.sentence"]()}
                have={m["mock.rule.coffee.have"]()}
                progress={1}
              />
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow={m["landing.features.shopping.eyebrow"]()}
            title={m["landing.features.shopping.title"]()}
            body={
              <>
                <p>{m["landing.features.shopping.body1"]()}</p>
                <p>{m["landing.features.shopping.body2"]()}</p>
              </>
            }
            reverse
          >
            <ScreenFrame label={m["landing.features.shopping.caption"]()}>
              <div className={styles.listPanel}>
                <ShoppingRow
                  name={m["mock.item.sourdough"]()}
                  detail={m["mock.shop.bread.detail"]()}
                  amount={m["mock.shop.bread.amount"]()}
                />
                <ShoppingRow
                  name={m["mock.item.milk"]()}
                  detail={m["mock.shop.milk.detail"]()}
                  amount={m["mock.shop.milk.amount"]()}
                  checked
                />
                <ShoppingRow
                  name={m["mock.item.bananas"]()}
                  detail={m["mock.shop.bananas.detail"]()}
                  amount={m["mock.shop.bananas.amount"]()}
                />
              </div>
              <span className={styles.putAway}>{m["landing.features.shopping.putAway"]()}</span>
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow={m["landing.features.scan.eyebrow"]()}
            title={m["landing.features.scan.title"]()}
            body={<p>{m["landing.features.scan.body"]()}</p>}
          >
            <ScreenFrame label={m["landing.features.scan.caption"]()}>
              <ScanSheet />
            </ScreenFrame>
          </Feature>
        </div>

        <section className={styles.extras} aria-labelledby="extras-title">
          <h2 id="extras-title" className={styles.sectionTitle}>
            {m["landing.extras.title"]()}
          </h2>
          <ul className={styles.extraList}>
            <Extra title={m["landing.extras.offline.title"]()}>
              {m["landing.extras.offline.body"]()}
            </Extra>
            <Extra title={m["landing.extras.shared.title"]()}>
              {m["landing.extras.shared.body"]()}
            </Extra>
            <Extra title={m["landing.extras.reminders.title"]()}>
              {m["landing.extras.reminders.body"]()}
            </Extra>
            <Extra title={m["landing.extras.selfHosted.title"]()}>
              {m["landing.extras.selfHosted.body"]()}
            </Extra>
          </ul>
        </section>

        <section className={styles.closing}>
          <h2 className={styles.sectionTitle}>{m["landing.closing.title"]()}</h2>
          <p className={styles.status}>{m["landing.closing.status"]()}</p>
          <CtaButton cta={cta} />
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}>
          Open <b>Pantry</b>
        </span>
        <span>{m["landing.footer"]()}</span>
      </footer>
    </div>
  );
}

function Feature({
  eyebrow,
  title,
  body,
  reverse,
  children,
}: {
  eyebrow: string;
  title: string;
  body: ReactNode;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={[styles.feature, reverse && styles.reverse].filter(Boolean).join(" ")}>
      <div className={styles.featureText}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {body}
      </div>
      <div className={styles.featureVisual}>{children}</div>
    </section>
  );
}

function Extra({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className={styles.extra}>
      <h3>{title}</h3>
      <p>{children}</p>
    </li>
  );
}
