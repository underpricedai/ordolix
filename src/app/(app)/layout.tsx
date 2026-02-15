import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/app-sidebar";
import { MobileBottomNav } from "@/shared/components/mobile-bottom-nav";

/**
 * Authenticated app layout with collapsible sidebar and main content area.
 *
 * @description Uses shadcn/ui SidebarProvider for state management
 * (expanded/collapsed, mobile sheet). The sidebar persists state via cookie.
 * All child pages render inside SidebarInset. Includes mobile bottom nav
 * (visible only below md breakpoint).
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="pb-16 md:pb-0">{children}</div>
      </SidebarInset>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
