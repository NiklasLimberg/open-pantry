import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

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
  pantry: { to: "/pantry", label: "Open your pantry" },
  setup: { to: "/setup", label: "Set up your pantry" },
  "sign-in": { to: "/sign-in", label: "Sign in" },
} as const;

function CtaButton({ cta, className }: { cta: LandingCta; className?: string }) {
  const { to, label } = ctaLinks[cta];
  return (
    <Button asChild className={className}>
      <Link to={to}>{label}</Link>
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
            <p className={styles.eyebrow}>Cupboard · Fridge · Freezer</p>
            <h1 className={styles.heroTitle}>
              See what is at home, use food in time, buy what is missing.
            </h1>
            <p className={styles.lead}>
              Open Pantry keeps track of how much is actually left — half a carton of milk, three
              slices of bread — reminds you before dates pass, and turns your own stock rules into a
              shopping list.
            </p>
            <div className={styles.heroActions}>
              <CtaButton cta={cta} />
              <Button asChild variant="secondary">
                <a href="#features">See the screens</a>
              </Button>
            </div>
          </div>
          <ScreenFrame
            variant="phone"
            className={styles.heroPhone}
            label="Pantry screen on a phone: sourdough bread and whole milk to use soon, and a whole milk card with two cartons, about 1.5 left."
          >
            <PhoneScreen title="Pantry" active="Pantry">
              <div className={styles.phoneSection}>
                <strong>Use soon</strong>
                <span>2 items · next 3 days</span>
              </div>
              <UseSoonCard
                icon="🍞"
                name="Sourdough bread"
                location="Cupboard"
                dateType="MHD"
                when="Tomorrow"
                date="22 Oct"
                amount="3 slices left"
              />
              <div className={styles.phoneSection}>
                <strong>Inventory</strong>
                <span>4 products</span>
              </div>
              <MilkGroupCard />
            </PhoneScreen>
          </ScreenFrame>
        </section>

        <div id="features" className={styles.features}>
          <Feature
            eyebrow="Use soon"
            title="The next dates come first"
            body={
              <>
                <p>
                  Items due in the next few days sit at the top of the pantry, ordered by date. MHD
                  and Verbrauchsdatum are labelled separately, and estimated reminders never pretend
                  to be printed dates.
                </p>
                <p>
                  Past a Verbrauchsdatum, an item reads Do not use and no longer counts as stock.
                </p>
              </>
            }
          >
            <ScreenFrame label="Two Use soon cards: sourdough bread, MHD tomorrow, 3 slices left; whole milk, MHD tomorrow, half left and opened.">
              <UseSoonCard
                icon="🍞"
                name="Sourdough bread"
                location="Cupboard"
                dateType="MHD"
                when="Tomorrow"
                date="22 Oct"
                amount="3 slices left"
              />
              <UseSoonCard
                icon="🥛"
                name="Whole milk"
                location="Fridge"
                dateType="MHD"
                when="Tomorrow"
                date="22 Oct"
                amount="½ left · opened"
              />
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow="Inventory"
            title="Amounts the way you see them"
            body={
              <>
                <p>
                  Update a pack with Full, ¾, ½, ¼, or Empty, or count exactly when it matters, like
                  slices of bread. Track amounts in cartons, loaves, slices, grams, or whatever fits
                  the product.
                </p>
                <p>
                  Several purchases of the same product group into one card, while each keeps its
                  own amount, date, and opened state.
                </p>
              </>
            }
            reverse
          >
            <ScreenFrame
              className={styles.cardGrid}
              label="Inventory cards: ground coffee, 1.5 packs across two batches; basmati rice, three quarters left; sourdough bread, 3 slices remaining."
            >
              <StockCard
                icon="☕"
                name="Ground coffee"
                meta="Cupboard · 2 batches"
                amount="1.5 packs"
                quarters={3}
                date="Earliest: MHD 10 Feb"
              />
              <StockCard
                icon="🍚"
                name="Basmati rice"
                meta="Cupboard · Opened"
                amount="¾"
                quarters={3}
                date="MHD 1 Jun 2027"
              />
              <StockCard
                icon="🍞"
                name="Sourdough bread"
                meta="Cupboard · Opened"
                amount="3 slices"
                date="MHD tomorrow"
              />
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow="Stock rules"
            title="Decide what enough means"
            body={
              <p>
                More than 3 slices of bread. At least 2 cartons of milk. One unopened spare pack of
                coffee. Each rule shows what is available, the target, and the shortage, and can be
                narrowed by brand, location, or opened state.
              </p>
            }
          >
            <ScreenFrame label="Three stock rules: bread for tomorrow is 1 slice short, milk in the fridge is 1 carton short, a spare coffee is covered.">
              <RuleCard
                icon="🍞"
                name="Bread for tomorrow"
                criteria="Category: Bread"
                sentence="Keep more than 3 slices at home."
                have="3 / 4 slices available"
                progress={3 / 4}
                status="1 slice short"
              />
              <RuleCard
                icon="🥛"
                name="Milk in the fridge"
                criteria="Category: Milk"
                sentence="Keep at least 2 cartons at home."
                have="About 1.5 / 2 cartons available"
                progress={1.5 / 2}
                status="1 carton short"
              />
              <RuleCard
                icon="☕"
                name="A spare coffee"
                criteria="Category: Coffee · Unopened only"
                sentence="Keep 1 unopened pack at home."
                have="1 / 1 packs available"
                progress={1}
              />
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow="Shopping"
            title="A list built from your rules"
            body={
              <>
                <p>
                  Shortages land on the shopping list with what is at home and which rule asked for
                  it. Add anything else by hand.
                </p>
                <p>
                  Tick items into the basket, then put purchases away in one step: confirm the
                  product, amount, place, and date, and the list recalculates.
                </p>
              </>
            }
            reverse
          >
            <ScreenFrame label="Shopping list: sourdough bread, 1 loaf; whole milk, 1 carton, already in the basket; bananas, added by hand.">
              <div className={styles.listPanel}>
                <ShoppingRow
                  name="Sourdough bread"
                  detail="3 slices at home · Bread for tomorrow"
                  amount="1 loaf"
                />
                <ShoppingRow
                  name="Whole milk"
                  detail="About 1.5 cartons at home · In basket"
                  amount="1 carton"
                  checked
                />
                <ShoppingRow name="Bananas" detail="Added by hand" amount="6 pieces" />
              </div>
              <span className={styles.putAway}>Put purchases away</span>
            </ScreenFrame>
          </Feature>

          <Feature
            eyebrow="Scan"
            title="Scan a barcode, then choose"
            body={
              <p>
                Scanning looks up the product on Open Food Facts and asks whether this is a new
                purchase or an update to one you already have. Camera frames stay on the device, and
                manual entry works when the camera or lookup does not.
              </p>
            }
          >
            <ScreenFrame label="Scan result for whole milk, 1 litre carton, offering Add a purchase or updating the opened or unopened carton.">
              <ScanSheet />
            </ScreenFrame>
          </Feature>
        </div>

        <section className={styles.extras} aria-labelledby="extras-title">
          <h2 id="extras-title" className={styles.sectionTitle}>
            Built for the kitchen, not the spreadsheet
          </h2>
          <ul className={styles.extraList}>
            <Extra title="Works offline">
              View the pantry, add stock, and check the list without a connection. Changes sync when
              you are back online.
            </Extra>
            <Extra title="Shared on your terms">
              Owner, editor, and viewer roles, plus view-only links you can revoke at any time.
            </Extra>
            <Extra title="Reminders you opt into">
              A daily digest of what is due, 2 days ahead at 09:00 by default, or none at all.
            </Extra>
            <Extra title="Runs on your server">
              One Node app and a PostgreSQL database. Your pantry stays on infrastructure you
              control.
            </Extra>
          </ul>
        </section>

        <section className={styles.closing}>
          <h2 className={styles.sectionTitle}>Know what is in the cupboard.</h2>
          <p className={styles.status}>
            Open Pantry is in early development. The screens above come from the design prototype;
            accounts, roles, and share links work today.
          </p>
          <CtaButton cta={cta} />
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}>
          Open <b>Pantry</b>
        </span>
        <span>Product data from Open Food Facts.</span>
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
