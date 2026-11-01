// @vitest-environment happy-dom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { updateBatch } from "#/features/inventory/stock.functions.ts";
import type { StockBatch, UpdateResult } from "#/features/inventory/stock.types.ts";
import { m } from "#/paraglide/messages.js";
import { renderWithQuery } from "#/test/dom.tsx";

import { BatchAmount } from "./BatchAmount.tsx";

const refresh = vi.fn<() => Promise<void>>(() => Promise.resolve());

vi.mock("#/features/inventory/stock-query.ts", () => ({ useRefreshStock: () => refresh }));
vi.mock("#/features/inventory/stock.functions.ts", () => ({
  updateBatch: vi.fn<(options: { data: unknown }) => Promise<UpdateResult>>(),
}));

const save = vi.mocked(updateBatch) as unknown as Mock<
  (options: { data: unknown }) => Promise<UpdateResult>
>;

const batch: StockBatch = {
  id: "b1",
  productId: "p1",
  locationId: "l1",
  quarters: 4,
  opened: false,
  dateKind: "none",
  date: null,
  revision: 3,
};

beforeEach(() => {
  save.mockReset();
  refresh.mockClear();
});

async function choose(label: string) {
  const user = userEvent.setup();
  renderWithQuery(<BatchAmount batch={batch} />);
  await user.click(screen.getByLabelText(label));
  return user;
}

const pressUpdate = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: m["global.update"]() }));

describe("BatchAmount", () => {
  it("offers Update only once the amount differs from the saved one", async () => {
    const user = userEvent.setup();
    renderWithQuery(<BatchAmount batch={batch} />);
    expect(screen.queryByRole("button", { name: m["global.update"]() })).toBeNull();

    await user.click(screen.getByLabelText(m["global.amount.half"]()));
    expect(screen.getByRole("button", { name: m["global.update"]() })).toBeTruthy();
  });

  it("saves a lower amount against the revision it showed, and marks the package opened", async () => {
    save.mockResolvedValue({ ok: true, revision: 4 } satisfies UpdateResult);
    const user = await choose(m["global.amount.half"]());
    await pressUpdate(user);

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith({
      data: { id: "b1", baseRevision: 3, quarters: 2, opened: true },
    });
  });

  it("discards the batch when it is used up, and says so before saving", async () => {
    save.mockResolvedValue({ ok: true, revision: 4 } satisfies UpdateResult);
    const user = await choose(m["global.amount.usedUp"]());
    expect(screen.getByText(m["batch.usedUpHint"]())).toBeTruthy();
    await pressUpdate(user);

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith({ data: { id: "b1", baseRevision: 3, discard: true } });
  });

  it("tells the user when another device changed the batch", async () => {
    save.mockResolvedValue({ ok: false, reason: "conflict" } satisfies UpdateResult);
    const user = await choose(m["global.amount.half"]());
    await pressUpdate(user);

    expect(await screen.findByText(m["batch.conflict"]())).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("tells the user when the batch was already used up elsewhere", async () => {
    save.mockResolvedValue({ ok: false, reason: "gone" } satisfies UpdateResult);
    const user = await choose(m["global.amount.half"]());
    await pressUpdate(user);

    expect(await screen.findByText(m["batch.gone"]())).toBeTruthy();
  });

  it("keeps the choice and reports a failure when saving does not go through", async () => {
    save.mockRejectedValue(new Error("offline"));
    const user = await choose(m["global.amount.half"]());
    await pressUpdate(user);

    expect(await screen.findByText(m["batch.saveFailed"]())).toBeTruthy();
    const half = screen.getByLabelText(m["global.amount.half"]()) as HTMLInputElement;
    expect(half.checked).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
  });
});
