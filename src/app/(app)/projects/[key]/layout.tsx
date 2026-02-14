/**
 * Project-scoped layout.
 *
 * @description Server component that provides project context from the URL key
 * parameter. Wraps all project sub-pages (board, backlog, timeline, etc.)
 * in a consistent container.
 *
 * @module project-layout
 */

import type { ReactNode } from "react";

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ key: string }>;
}

/**
 * Layout for project-scoped routes under /projects/[key]/*.
 *
 * @description Receives the project key from the URL and wraps children
 * in a flex container. The key is available to child pages via their own
 * params prop; this layout provides the structural wrapper.
 *
 * @param props - ProjectLayoutProps with children and params
 * @returns Project layout wrapper
 */
export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  // Await params per Next.js 15 async params convention
  await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
