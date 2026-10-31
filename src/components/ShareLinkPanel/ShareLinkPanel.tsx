import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { createShareLink, revokeShareLink } from "#/domains/sharing/share-links.functions.ts";

import { Button } from "../Button/Button.tsx";
import { Card } from "../Card/Card.tsx";
import { FormError } from "../Form/Form.tsx";
import styles from "./ShareLinkPanel.module.css";

type ShareLink = { id: string; label: string | null; createdAt: Date };

export function ShareLinkPanel({ links }: { links: ShareLink[] }) {
  const router = useRouter();
  const create = useServerFn(createShareLink);
  const revoke = useServerFn(revokeShareLink);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : m["share.failed"]());
    }
  }

  return (
    <Card
      title={m["share.title"]()}
      actions={
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            run(async () => {
              const { token } = await create({ data: {} });
              setNewUrl(new URL(`/share/${token}`, window.location.origin).href);
            })
          }
        >
          {m["share.create"]()}
        </Button>
      }
    >
      <p className={styles.hint}>{m["share.hint"]()}</p>
      <FormError message={error} />
      {newUrl && (
        <div className={styles.newLink}>
          <p>{m["share.copyNow"]()}</p>
          <input
            className={styles.url}
            readOnly
            value={newUrl}
            aria-label={m["share.newLinkLabel"]()}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
      {links.length === 0 ? (
        <p className={styles.empty}>{m["share.none"]()}</p>
      ) : (
        <ul className={styles.list}>
          {links.map((link) => (
            <li key={link.id} className={styles.item}>
              <span>
                {m["share.created"]({
                  label: link.label ?? m["share.link"](),
                  date: new Date(link.createdAt).toLocaleDateString(getLocale()),
                })}
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => run(() => revoke({ data: { id: link.id } }))}
              >
                {m["share.revoke"]()}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
