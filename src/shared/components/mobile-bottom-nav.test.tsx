import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { MobileBottomNav } from "./mobile-bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/issues"),
}));

const messages = {
  mobileNav: {
    label: "Main navigation",
    home: "Home",
    issues: "Issues",
    boards: "Boards",
    search: "Search",
    more: "More",
  },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("MobileBottomNav", () => {
  it("renders all 5 nav items", () => {
    render(
      <Wrapper>
        <MobileBottomNav />
      </Wrapper>,
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Boards")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("marks the active item with aria-current", () => {
    render(
      <Wrapper>
        <MobileBottomNav />
      </Wrapper>,
    );
    const issuesLink = screen.getByText("Issues").closest("a");
    expect(issuesLink).toHaveAttribute("aria-current", "page");

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).not.toHaveAttribute("aria-current");
  });

  it("has accessible navigation landmark", () => {
    render(
      <Wrapper>
        <MobileBottomNav />
      </Wrapper>,
    );
    expect(screen.getByLabelText("Main navigation")).toBeInTheDocument();
  });
});
