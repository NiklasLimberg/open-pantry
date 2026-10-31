import { m } from "#/paraglide/messages.js";
import { productName } from "#/domains/inventory/product-name.ts";
import { useMemo, useState } from "react";

import { todayIn } from "#/domains/inventory/format.ts";
import { groupStock } from "#/domains/inventory/group-stock.ts";
import { useStockQuery, type InitialStock } from "#/domains/inventory/stock-query.ts";

import { Card } from "../Card/Card.tsx";
import { Input, Select } from "../Form/Form.tsx";
import { ProductCard } from "../ProductCard/ProductCard.tsx";
import { SyncStatus } from "../SyncStatus/SyncStatus.tsx";
import styles from "./StockView.module.css";
import { useScrollToAdded } from "./use-scroll-to-added.ts";

type Props = {
  /**
   * The pantry as loaded by the server, so its HTML already contains the list. Missing when the
   * page was reached by moving around in the browser; the query then supplies it.
   */
  initial?: InitialStock;
  timeZone: string;
  canEdit: boolean;
  /** Product just added: scrolled into view and highlighted for a moment. */
  addedId?: string;
  /** Called once the highlight has been shown, so the caller can clear it. */
  onAddedShown?: () => void;
};

const emptyStock = { batches: [], products: [], locations: [] };

/** The pantry list with search and location filters. */
export function StockView({ initial, timeZone, canEdit, addedId, onAddedShown }: Props) {
  const query = useStockQuery(initial);
  const { batches, products, locations } = query.data ?? emptyStock;
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const groups = useMemo(
    () => groupStock(batches, products, { search, locationId }),
    [batches, products, search, locationId],
  );
  useScrollToAdded(addedId, onAddedShown);

  const added = products.find((product) => product.id === addedId);
  const today = todayIn(timeZone);
  const usesOpenFoodFacts = products.some((product) => product.source === "openfoodfacts");

  return (
    <div className={styles.stock}>
      <SyncStatus query={query} />
      {added && (
        <output className={styles.added}>
          {m["stock.added"]({ name: productName(added) ?? m["stock.fallbackProduct"]() })}
        </output>
      )}
      <div className={styles.filters}>
        <Input
          type="search"
          aria-label={m["stock.search.label"]()}
          placeholder={m["stock.search.placeholder"]()}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          aria-label={m["stock.filterLocation"]()}
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          <option value="">{m["stock.allLocations"]()}</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
      </div>

      {!query.data ? (
        <Message>{query.isError ? m["stock.loadFailed"]() : m["stock.loading"]()}</Message>
      ) : groups.length === 0 ? (
        <Message>
          {batches.length > 0
            ? m["stock.noMatch"]()
            : `${m["stock.empty"]()}${canEdit ? ` ${m["stock.emptyHint"]()}` : ""}`}
        </Message>
      ) : (
        groups.map((group) => (
          <ProductCard
            key={group.product.id}
            group={group}
            locations={locations}
            today={today}
            canEdit={canEdit}
            highlighted={group.product.id === addedId}
          />
        ))
      )}
      {usesOpenFoodFacts && (
        <p className={styles.attribution}>
          {m["stock.attribution.prefix"]()}{" "}
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
            {m["global.openFoodFacts"]()}
          </a>{" "}
          {m["stock.attribution.suffix"]()}
        </p>
      )}
    </div>
  );
}

function Message({ children }: { children: string }) {
  return (
    <Card>
      <p className={styles.empty}>{children}</p>
    </Card>
  );
}
