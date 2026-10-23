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
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Card
      title="View-only links"
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
          Create link
        </Button>
      }
    >
      <p className={styles.hint}>
        Anyone with a link can see this pantry without signing in, but cannot change anything.
      </p>
      <FormError message={error} />
      {newUrl && (
        <div className={styles.newLink}>
          <p>Copy this link now. It won't be shown again.</p>
          <input
            className={styles.url}
            readOnly
            value={newUrl}
            aria-label="New share link"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
      {links.length === 0 ? (
        <p className={styles.empty}>No active links.</p>
      ) : (
        <ul className={styles.list}>
          {links.map((link) => (
            <li key={link.id} className={styles.item}>
              <span>
                {link.label ?? "Link"} · created {new Date(link.createdAt).toLocaleDateString()}
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => run(() => revoke({ data: { id: link.id } }))}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
