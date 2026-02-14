import { cn } from "@/shared/lib/utils";

interface EmptyStateProps {
  /** Icon component to display */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * EmptyState renders a centered placeholder for pages or sections with no content.
 *
 * @description Used for empty lists, search results, boards, etc.
 * @param props - EmptyStateProps
 * @returns A centered empty state component
 *
 * @example
 * <EmptyState
 *   icon={<Inbox className="size-12" />}
 *   title="No issues found"
 *   description="Create your first issue to get started."
 *   action={<Button>Create Issue</Button>}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="mb-4 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
