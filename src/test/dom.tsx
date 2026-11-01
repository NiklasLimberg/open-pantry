import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach } from "vitest";

// For component tests (`// @vitest-environment happy-dom` at the top of the file). Vitest runs
// without globals, so Testing Library's automatic cleanup is registered here.
afterEach(cleanup);

export { render };

/** Renders with a TanStack Query client that does not retry, so failures show up at once. */
export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
