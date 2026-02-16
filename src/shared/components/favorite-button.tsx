"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";
import { ActionTooltip } from "@/shared/components/action-tooltip";

/**
 * Props for the FavoriteButton component.
 */
interface FavoriteButtonProps {
  /** The type of entity being favorited */
  entityType: "issue" | "project" | "board" | "dashboard";
  /** The ID of the entity being favorited */
  entityId: string;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * FavoriteButton renders a star icon button to toggle an entity as a favorite.
 *
 * @description Uses optimistic UI updates for instant feedback. The star is
 * filled yellow when the entity is favorited, and outlined when it is not.
 * Accessible with proper aria-label that reflects the current state.
 *
 * @param props - FavoriteButtonProps
 * @returns A ghost icon button with a star icon
 *
 * @example
 * <FavoriteButton entityType="issue" entityId="issue-123" />
 */
export function FavoriteButton({
  entityType,
  entityId,
  className,
}: FavoriteButtonProps) {
  const t = useTranslations("favorites");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.favorite.check.useQuery({
    entityType,
    entityId,
  });

  const toggleMutation = trpc.favorite.toggle.useMutation({
    onMutate: async () => {
      // Cancel outgoing refetches
      await utils.favorite.check.cancel({ entityType, entityId });

      // Snapshot previous value
      const previous = utils.favorite.check.getData({ entityType, entityId });

      // Optimistically update
      utils.favorite.check.setData(
        { entityType, entityId },
        { favorited: !previous?.favorited },
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        utils.favorite.check.setData(
          { entityType, entityId },
          context.previous,
        );
      }
    },
    onSettled: () => {
      // Invalidate to refetch
      void utils.favorite.check.invalidate({ entityType, entityId });
      void utils.favorite.list.invalidate();
    },
  });

  const isFavorited = data?.favorited ?? false;

  const handleToggle = () => {
    if (toggleMutation.isPending) return;
    toggleMutation.mutate({ entityType, entityId });
  };

  const label = isFavorited ? t("removeFromFavorites") : t("addToFavorites");

  return (
    <ActionTooltip content={label}>
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-8", className)}
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={label}
        aria-pressed={isFavorited}
      >
        <Star
          className={cn(
            "size-4 transition-colors",
            isFavorited
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground",
          )}
          aria-hidden="true"
        />
      </Button>
    </ActionTooltip>
  );
}
