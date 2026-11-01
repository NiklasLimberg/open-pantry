// @vitest-environment happy-dom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { addPurchase } from "#/features/inventory/stock.functions.ts";
import type { StockLocation, StockProduct } from "#/features/inventory/stock.types.ts";
import { m } from "#/paraglide/messages.js";
import { renderWithQuery } from "#/test/dom.tsx";

import { AddPurchase } from "./AddPurchase.tsx";

const refresh = vi.fn<() => Promise<void>>(() => Promise.resolve());

vi.mock("#/features/pantry/use-pantry.ts", () => ({
  usePantry: () => ({ timeZone: "Europe/Berlin" }),
}));
vi.mock("#/features/inventory/stock-query.ts", () => ({ useRefreshStock: () => refresh }));
vi.mock("#/features/inventory/stock.functions.ts", () => ({
  addPurchase: vi.fn<(options: { data: AddPurchaseCall }) => Promise<{ productId: string }>>(),
}));

type AddPurchaseCall = Parameters<typeof addPurchase>[0]["data"];
const save = vi.mocked(addPurchase) as unknown as Mock<
  (options: { data: AddPurchaseCall }) => Promise<{ productId: string }>
>;
const onSaved = vi.fn<(productId: string) => void>();

const locations: StockLocation[] = [
  { id: "cupboard", name: "Cupboard" },
  { id: "fridge", name: "Fridge" },
];

const barcode = "4006381333931";

const existing: StockProduct = {
  id: "p1",
  barcode,
  name: "Oat drink",
  names: {},
  brand: "Oatly",
  trackUnit: "carton",
  printedDateKind: "use_by",
  packageAmount: 1000,
  packageUnit: "ml",
  suggestedPackage: null,
  imageUrl: null,
  storageInstructions: null,
  source: null,
};

beforeEach(() => {
  save.mockReset();
  refresh.mockClear();
  onSaved.mockClear();
});

function renderForm(props: { barcode?: string | null; existing?: StockProduct | null } = {}) {
  const user = userEvent.setup();
  renderWithQuery(
    <AddPurchase
      barcode={props.barcode === undefined ? barcode : props.barcode}
      existing={props.existing ?? null}
      lookup={null}
      locations={locations}
      onSaved={onSaved}
    />,
  );
  return user;
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: m["purchase.submit"]() }));

describe("AddPurchase", () => {
  it("asks for a name when there is no barcode to identify the product", async () => {
    const user = renderForm({ barcode: null });
    await user.type(screen.getByLabelText(m["global.date"]()), "2803");
    await submit(user);

    expect(await screen.findByText(m["purchase.validation.enterName"]())).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it("asks for a date while the package prints one", async () => {
    const user = renderForm();
    await submit(user);

    expect(await screen.findByText(m["purchase.validation.enterDate"]())).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it("drops the date error once the package is switched to no printed date, and saves", async () => {
    save.mockResolvedValue({ productId: "p" });
    const user = renderForm();
    await submit(user);
    expect(await screen.findByText(m["purchase.validation.enterDate"]())).toBeTruthy();

    await user.selectOptions(
      screen.getByLabelText(m["purchase.dateOnPackage"]()),
      m["global.dateKind.none"](),
    );
    expect(screen.queryByText(m["purchase.validation.enterDate"]())).toBeNull();

    await submit(user);
    await waitFor(() => expect(save).toHaveBeenCalled());
  });

  it("asks for the date again when the package is switched back to a printed date", async () => {
    const user = renderForm();
    const kind = screen.getByLabelText(m["purchase.dateOnPackage"]());
    await user.selectOptions(kind, m["global.dateKind.none"]());
    await user.selectOptions(kind, m["purchase.dateKind.mhd"]());
    await submit(user);

    expect(await screen.findByText(m["purchase.validation.enterDate"]())).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it("does not ask for a date when the package prints none", async () => {
    save.mockResolvedValue({ productId: "p" });
    const user = renderForm();
    await user.selectOptions(
      screen.getByLabelText(m["purchase.dateOnPackage"]()),
      m["global.dateKind.none"](),
    );
    await submit(user);

    await waitFor(() => expect(save).toHaveBeenCalled());
    const [{ data }] = save.mock.calls[0];
    expect(data.batches[0]).toMatchObject({ dateKind: "none", date: null });
  });

  it("saves the typed date as a calendar date, with one batch per package", async () => {
    save.mockResolvedValue({ productId: "p" });
    const user = renderForm();
    await user.type(screen.getByLabelText(m["global.date"]()), "2803");
    const count = screen.getByLabelText(m["purchase.howMany"]());
    await user.clear(count);
    await user.type(count, "3");
    await user.selectOptions(screen.getByLabelText(m["global.location"]()), "Fridge");
    await submit(user);

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [{ data }] = save.mock.calls[0];
    expect(data.batches).toHaveLength(3);
    expect(data.batches[0]).toMatchObject({
      locationId: "fridge",
      quarters: 4,
      dateKind: "mhd",
      date: expect.stringMatching(/^\d{4}-03-28$/),
    });
    expect(data.newProduct).toMatchObject({ id: data.productId, barcode });
    expect(onSaved).toHaveBeenCalledWith(data.productId);
    expect(refresh).toHaveBeenCalled();
  });

  it("limits a purchase to 20 packages", async () => {
    const user = renderForm();
    await user.type(screen.getByLabelText(m["global.date"]()), "2803");
    const count = screen.getByLabelText(m["purchase.howMany"]());
    await user.clear(count);
    await user.type(count, "21");
    await submit(user);

    expect(await screen.findByText(m["purchase.validation.atMostTwenty"]())).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it("echoes what a typed date means, or says it is not a date", async () => {
    const user = renderForm();
    const date = screen.getByLabelText(m["global.date"]());
    await user.type(date, "2803");
    expect(screen.queryByText(m["purchase.dateInvalid"]())).toBeNull();
    expect(screen.queryByText(m["purchase.dateExample"]())).toBeNull();

    await user.clear(date);
    await user.type(date, "9999");
    expect(screen.getByText(m["purchase.dateInvalid"]())).toBeTruthy();
  });

  it("reports a failed save, keeps the form usable and does not leave the dialog", async () => {
    save.mockRejectedValue(new Error("offline"));
    const user = renderForm();
    await user.type(screen.getByLabelText(m["global.date"]()), "2803");
    await submit(user);

    expect(await screen.findByText(m["purchase.saveFailed"]())).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: m["purchase.submit"]() }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("sends the same package IDs when a failed save is retried", async () => {
    save.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ productId: "p" });
    const user = renderForm();
    await user.type(screen.getByLabelText(m["global.date"]()), "2803");
    await submit(user);
    await screen.findByText(m["purchase.saveFailed"]());
    await submit(user);

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(save.mock.calls[1][0].data.productId).toBe(save.mock.calls[0][0].data.productId);
    expect(save.mock.calls[1][0].data.batches[0].id).toBe(save.mock.calls[0][0].data.batches[0].id);
  });

  it("shows a known product instead of asking for its details, and preselects its date type", () => {
    renderForm({ existing });

    expect(screen.getByText("Oat drink")).toBeTruthy();
    expect(screen.queryByLabelText(m["purchase.brand"]())).toBeNull();
    const dateKind = screen.getByLabelText(m["purchase.dateOnPackage"]()) as HTMLSelectElement;
    expect(dateKind.value).toBe("use_by");
  });
});
