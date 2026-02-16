import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/app-sidebar";
import { MobileBottomNav } from "@/shared/components/mobile-bottom-nav";
import { CommandPalette } from "@/shared/components/command-palette";
import { PeekProvider } from "@/shared/providers/peek-provider";
import { IssuePeekPanel } from "@/modules/issues/components/IssuePeekPanel";
import { ShortcutsProvider } from "@/shared/providers/shortcuts-provider";
import { AppShortcuts } from "@/shared/components/app-shortcuts";

/**
 * Authenticated app layout with collapsible sidebar and main content area.
 *
 * @description Uses shadcn/ui SidebarProvider for state management
 * (expanded/collapsed, mobile sheet). The sidebar persists state via cookie.
 * All child pages render inside SidebarInset. Includes mobile bottom nav
 * (visible only below md breakpoint). Renders the global command palette
 * (Cmd+K / Ctrl+K) for quick navigation and actions. Wraps everything in
 * PeekProvider so the issue slide-over panel is available on every page.
 * ShortcutsProvider enables global keyboard shortcuts (Jira-like: c, g b,
 * g d, ?, Escape, etc.).
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ShortcutsProvider>
      <PeekProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="pb-16 md:pb-0">{children}</div>
          </SidebarInset>
          <MobileBottomNav />
          <CommandPalette />
          <IssuePeekPanel />
          <AppShortcuts />
        </SidebarProvider>
      </PeekProvider>
    </ShortcutsProvider>
  );
}
