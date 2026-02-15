import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponsiveTable, type ResponsiveColumnDef } from "./responsive-table";

const mockUseIsMobile = vi.fn(() => false);
vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

interface TestRow {
  id: string;
  name: string;
  status: string;
  email: string;
}

const testData: TestRow[] = [
  { id: "1", name: "Alice", status: "Active", email: "alice@test.com" },
  { id: "2", name: "Bob", status: "Inactive", email: "bob@test.com" },
];

const columns: ResponsiveColumnDef<TestRow>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, priority: 1 },
  { key: "status", header: "Status", cell: (r) => r.status, priority: 2 },
  { key: "email", header: "Email", cell: (r) => r.email, priority: 4 },
];

describe("ResponsiveTable", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  it("renders a table with all columns on desktop", () => {
    render(
      <ResponsiveTable
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders mobile card view when mobileCard is provided and on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    render(
      <ResponsiveTable
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        mobileCard={(r) => (
          <div data-testid="card">{r.name} - {r.status}</div>
        )}
      />,
    );
    const cards = screen.getAllByTestId("card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Alice - Active");
  });

  it("shows empty message when data is empty", () => {
    render(
      <ResponsiveTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        emptyMessage="No items found"
      />,
    );
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", async () => {
    const onClick = vi.fn();
    render(
      <ResponsiveTable
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        onRowClick={onClick}
      />,
    );
    await userEvent.click(screen.getByText("Alice"));
    expect(onClick).toHaveBeenCalledWith(testData[0]);
  });

  it("applies responsive CSS classes based on priority", () => {
    render(
      <ResponsiveTable
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
      />,
    );
    // Priority 1 = always visible (no hidden class)
    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader?.className).not.toContain("hidden");

    // Priority 2 = hidden sm:table-cell
    const statusHeader = screen.getByText("Status").closest("th");
    expect(statusHeader?.className).toContain("hidden");
    expect(statusHeader?.className).toContain("sm:table-cell");

    // Priority 4 = hidden lg:table-cell
    const emailHeader = screen.getByText("Email").closest("th");
    expect(emailHeader?.className).toContain("hidden");
    expect(emailHeader?.className).toContain("lg:table-cell");
  });
});
