import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "./responsive-dialog";

// Mock useIsMobile
const mockUseIsMobile = vi.fn(() => false);
vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("ResponsiveDialog", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  it("renders Dialog on desktop", () => {
    mockUseIsMobile.mockReturnValue(false);
    render(
      <Wrapper>
        <ResponsiveDialog open onOpenChange={() => {}}>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <p>Content</p>
            <ResponsiveDialogFooter>
              <button>OK</button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </Wrapper>,
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    // Dialog renders with data-slot="dialog" wrapper
    const dialogContent = document.querySelector('[data-slot="dialog-content"]');
    expect(dialogContent).toBeInTheDocument();
  });

  it("renders Sheet on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    render(
      <Wrapper>
        <ResponsiveDialog open onOpenChange={() => {}}>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Mobile Title</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <p>Mobile Content</p>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </Wrapper>,
    );
    expect(screen.getByText("Mobile Title")).toBeInTheDocument();
    expect(screen.getByText("Mobile Content")).toBeInTheDocument();
    // Sheet renders with data-slot="sheet-content"
    const sheetContent = document.querySelector('[data-slot="sheet-content"]');
    expect(sheetContent).toBeInTheDocument();
  });
});
