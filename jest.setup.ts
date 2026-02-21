import "@testing-library/jest-dom";

if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = jest.fn() as any;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  } as unknown as typeof ResizeObserver;
}
