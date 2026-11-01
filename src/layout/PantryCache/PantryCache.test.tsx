// @vitest-environment happy-dom
import { useMutation, useQuery } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getSession } from "#/features/auth/auth.functions.ts";
import { endSession } from "#/features/auth/end-session.ts";
import { render } from "#/test/dom.tsx";

import { PantryCache } from "./PantryCache.tsx";

vi.mock("#/features/auth/auth.functions.ts", () => ({
  getSession: vi.fn<() => Promise<unknown>>(),
}));
vi.mock("#/features/auth/end-session.ts", () => ({ endSession: vi.fn<() => Promise<void>>() }));
vi.mock("#/features/inventory/stock-query.ts", () => ({
  stockQueryOptions: (pantryId: string) => ({ queryKey: ["stock", pantryId], queryFn: () => null }),
}));

const session = vi.mocked(getSession) as unknown as Mock<() => Promise<unknown>>;
const leave = vi.mocked(endSession);

beforeEach(() => {
  session.mockReset();
  leave.mockReset();
});

function FailingQuery({ name }: { name: string }) {
  useQuery({ queryKey: [name], queryFn: () => Promise.reject(new Error("failed")), retry: false });
  return null;
}

function FailingSave() {
  const save = useMutation({ mutationFn: () => Promise.reject(new Error("failed")) });
  return (
    <button type="button" onClick={() => save.mutate()}>
      save
    </button>
  );
}

function renderCache(children: React.ReactNode) {
  return render(
    <PantryCache userId="u1" pantryId="p1" prefetch={false}>
      {children}
    </PantryCache>,
  );
}

describe("PantryCache", () => {
  it("leaves the signed-in screens when a call fails because the session is gone", async () => {
    session.mockResolvedValue(null);
    renderCache(<FailingQuery name="a" />);

    await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
  });

  it("stays put when a call fails but the session is still valid", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    renderCache(<FailingQuery name="a" />);

    await waitFor(() => expect(session).toHaveBeenCalledTimes(1));
    expect(leave).not.toHaveBeenCalled();
  });

  it("does not treat an unreachable server as a signed-out user", async () => {
    session.mockRejectedValue(new TypeError("Failed to fetch"));
    renderCache(<FailingQuery name="a" />);

    await waitFor(() => expect(session).toHaveBeenCalledTimes(1));
    expect(leave).not.toHaveBeenCalled();
  });

  it("asks the server once when several calls fail together", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    renderCache(
      <>
        <FailingQuery name="a" />
        <FailingQuery name="b" />
        <FailingQuery name="c" />
      </>,
    );

    await waitFor(() => expect(session).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(session).toHaveBeenCalledTimes(1);
  });

  it("checks the session after a failed save too", async () => {
    session.mockResolvedValue(null);
    renderCache(<FailingSave />);
    await userEvent.setup().click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
  });
});
