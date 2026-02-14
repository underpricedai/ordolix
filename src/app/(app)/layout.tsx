import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/app-sidebar";

/**
 * Authenticated app layout with collapsible sidebar and main content area.
 *
 * @description Uses shadcn/ui SidebarProvider for state management
 * (expanded/collapsed, mobile sheet). The sidebar persists state via cookie.
 * All child pages render inside SidebarInset.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
