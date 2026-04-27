import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../pages/dashboard/DashboardPage";

// Mock API module (used internally by device.service)
vi.mock("../services/api", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: vi.fn() } },
  },
}));

// Mock timezone service
vi.mock("../services/timezone.service", () => ({
  getPreferredTimeZone: vi.fn(() => "UTC"),
  setPreferredTimeZone: vi.fn(),
  formatDateTimeForTimeZone: vi.fn(() => "2026-01-18 12:00"),
  getTimeZoneOption: vi.fn(() => ({
    timeZone: "UTC",
    label: "UTC",
    offsetLabel: "UTC",
    localTimeLabel: "12:00",
    searchText: "utc",
  })),
  timeZoneOptions: [
    {
      timeZone: "UTC",
      label: "UTC",
      offsetLabel: "UTC",
      localTimeLabel: "12:00",
      searchText: "utc",
    },
  ],
}));

// Mock toast
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
  },
}));

describe("DashboardPage", () => {
  it("renders dashboard header and stats", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(await screen.findByText("IoT dashboard")).toBeInTheDocument();
  });

  it("shows connection guide section", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("How to connect")).toBeInTheDocument();
    expect(
      await screen.findByText(/Power on your ESP32 sensor/),
    ).toBeInTheDocument();
  });
});
