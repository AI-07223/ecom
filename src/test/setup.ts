import "@testing-library/jest-dom";
import { vi } from "vitest";

// Silence console.error/log in tests unless explicitly needed
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "log").mockImplementation(() => {});
