import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

// ── Polyfills for jsdom ────────────────────────────────────────────────────

// cmdk uses ResizeObserver internally
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// cmdk calls scrollIntoView on selected items
Element.prototype.scrollIntoView = vi.fn();

import { CommandPalette } from "./command-palette";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockQuickSearchQuery = vi.fn();
vi.mock("@/shared/lib/trpc", () => ({
  trpc: {
    search: {
      quickSearch: {
        useQuery: (...args: unknown[]) => mockQuickSearchQuery(...args),
      },
    },
  },
}));

// ── Messages ───────────────────────────────────────────────────────────────

const messages = {
  commandPalette: {
    placeholder: "Search issues, projects, and commands...",
    noResults: "No results found.",
    groups: {
      issues: "Issues",
      projects: "Projects",
      navigation: "Navigation",
      actions: "Actions",
    },
    actions: {
      createIssue: "Create Issue",
      createProject: "Create Project",
      toggleTheme: "Toggle Dark Mode",
      goToAdmin: "Go to Admin",
      openSearch: "Advanced Search",
    },
  },
  nav: {
    dashboard: "Dashboard",
    boards: "Boards",
    gantt: "Gantt",
    search: "Search",
    settings: "Settings",
    admin: "Admin",
  },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockPush.mockClear();
    mockQuickSearchQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens with Cmd+K keyboard shortcut", () => {
    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Dialog should not be visible initially
    expect(screen.queryByPlaceholderText("Search issues, projects, and commands...")).not.toBeInTheDocument();

    // Trigger Cmd+K
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    // Dialog should now be visible
    expect(screen.getByPlaceholderText("Search issues, projects, and commands...")).toBeInTheDocument();
  });

  it("opens with Ctrl+K keyboard shortcut", () => {
    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    act(() => {
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    });

    expect(screen.getByPlaceholderText("Search issues, projects, and commands...")).toBeInTheDocument();
  });

  it("closes with Escape", () => {
    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });
    expect(screen.getByPlaceholderText("Search issues, projects, and commands...")).toBeInTheDocument();

    // Close with Escape
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    // Wait for dialog to close
    waitFor(() => {
      expect(screen.queryByPlaceholderText("Search issues, projects, and commands...")).not.toBeInTheDocument();
    });
  });

  it("debounces search input by 300ms", () => {
    mockQuickSearchQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    const input = screen.getByPlaceholderText("Search issues, projects, and commands...");

    // Type search term
    act(() => {
      fireEvent.change(input, { target: { value: "test" } });
    });

    // The query should be called with enabled: false initially (debounce hasn't fired)
    // After 300ms, debounced value updates and query is enabled
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After debounce, the query should be enabled with the search term
    expect(mockQuickSearchQuery).toHaveBeenCalledWith(
      { term: "test", limit: 10 },
      { enabled: true },
    );
  });

  it("shows grouped issue and project results", () => {
    mockQuickSearchQuery.mockReturnValue({
      data: {
        issues: [
          {
            id: "issue-1",
            key: "PROJ-123",
            summary: "Fix login bug",
            status: { name: "In Progress", category: "IN_PROGRESS" },
            issueType: { name: "Bug" },
            priority: { name: "High" },
            assignee: null,
            reporter: null,
            project: { id: "p1", key: "PROJ", name: "Project One" },
          },
        ],
        projects: [
          {
            id: "project-1",
            key: "PROJ",
            name: "Project One",
          },
        ],
      },
      isLoading: false,
    });

    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    // Type to trigger search
    const input = screen.getByPlaceholderText("Search issues, projects, and commands...");
    act(() => {
      fireEvent.change(input, { target: { value: "proj" } });
      vi.advanceTimersByTime(300);
    });

    // Check group headings
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();

    // Check issue result
    expect(screen.getByText("PROJ-123")).toBeInTheDocument();
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();

    // Check project result
    expect(screen.getByText("PROJ")).toBeInTheDocument();
    expect(screen.getByText("Project One")).toBeInTheDocument();
  });

  it("shows navigation pages", () => {
    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    // Navigation group should be visible with default pages
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Boards")).toBeInTheDocument();
    expect(screen.getByText("Gantt")).toBeInTheDocument();
  });

  it("shows action items", () => {
    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    // Actions group should be visible
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Create Issue")).toBeInTheDocument();
    expect(screen.getByText("Create Project")).toBeInTheDocument();
    expect(screen.getByText("Toggle Dark Mode")).toBeInTheDocument();
  });

  it("navigates to issue on selection", () => {
    mockQuickSearchQuery.mockReturnValue({
      data: {
        issues: [
          {
            id: "issue-1",
            key: "TEST-42",
            summary: "Test issue",
            status: { name: "Open", category: "TO_DO" },
            issueType: { name: "Task" },
            priority: null,
            assignee: null,
            reporter: null,
            project: { id: "p1", key: "TEST", name: "Test Project" },
          },
        ],
        projects: [],
      },
      isLoading: false,
    });

    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open and search
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    const input = screen.getByPlaceholderText("Search issues, projects, and commands...");
    act(() => {
      fireEvent.change(input, { target: { value: "test" } });
      vi.advanceTimersByTime(300);
    });

    // Click the issue result
    const issueItem = screen.getByText("TEST-42").closest("[cmdk-item]");
    if (issueItem) {
      act(() => {
        fireEvent.click(issueItem);
      });
    }

    expect(mockPush).toHaveBeenCalledWith("/projects/TEST/issues/TEST-42");
  });

  it("navigates to project on selection", () => {
    mockQuickSearchQuery.mockReturnValue({
      data: {
        issues: [],
        projects: [
          {
            id: "project-1",
            key: "DEMO",
            name: "Demo Project",
          },
        ],
      },
      isLoading: false,
    });

    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open and search
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    const input = screen.getByPlaceholderText("Search issues, projects, and commands...");
    act(() => {
      fireEvent.change(input, { target: { value: "demo" } });
      vi.advanceTimersByTime(300);
    });

    // Click the project result
    const projectItem = screen.getByText("DEMO").closest("[cmdk-item]");
    if (projectItem) {
      act(() => {
        fireEvent.click(projectItem);
      });
    }

    expect(mockPush).toHaveBeenCalledWith("/projects/DEMO");
  });

  it("shows no results message when search yields nothing", () => {
    mockQuickSearchQuery.mockReturnValue({
      data: { issues: [], projects: [] },
      isLoading: false,
    });

    render(
      <Wrapper>
        <CommandPalette />
      </Wrapper>,
    );

    // Open and search for something that filters out everything
    act(() => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });

    const input = screen.getByPlaceholderText("Search issues, projects, and commands...");
    act(() => {
      fireEvent.change(input, { target: { value: "xyznonexistent123" } });
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });
});
