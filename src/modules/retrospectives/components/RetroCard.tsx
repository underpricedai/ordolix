"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Edit2, ThumbsUp, Trash2, User } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

/**
 * Data shape for a retrospective card.
 */
export interface RetroCardData {
  id: string;
  text: string;
  category: string;
  votes: number;
  authorName?: string;
  isAnonymous: boolean;
  isOwnCard: boolean;
}

interface RetroCardProps {
  /** The card data */
  card: RetroCardData;
  /** Callback when vote button is clicked */
  onVote?: (id: string) => void;
  /** Callback when card is edited */
  onEdit?: (id: string, text: string) => void;
  /** Callback when card is deleted */
  onDelete?: (id: string) => void;
  /** Whether the current user has already voted */
  hasVoted?: boolean;
}

const categoryColors: Record<string, string> = {
  "Went Well": "border-l-green-500",
  "To Improve": "border-l-red-500",
  "Action Items": "border-l-blue-500",
};

/**
 * RetroCard renders an individual retrospective card with text, votes,
 * and action buttons.
 *
 * @description Each card shows its text content, vote count with up/down buttons,
 * author (hidden if anonymous), category badge, and edit/delete buttons for
 * the card owner. The left border is color-coded by category.
 *
 * @param props - RetroCardProps
 * @returns A retro card component
 *
 * @example
 * <RetroCard card={cardData} onVote={handleVote} onEdit={handleEdit} onDelete={handleDelete} />
 */
export function RetroCard({
  card,
  onVote,
  onEdit,
  onDelete,
  hasVoted = false,
}: RetroCardProps) {
  const t = useTranslations("retrospectives");
  const tc = useTranslations("common");

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(card.text);

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== card.text) {
      onEdit?.(card.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(card.text);
    setIsEditing(false);
  };

  return (
    <Card
      className={cn(
        "border-l-4 transition-shadow hover:shadow-md",
        categoryColors[card.category] ?? "border-l-muted-foreground",
      )}
      role="article"
      aria-label={`${t("card")}: ${card.text.slice(0, 50)}`}
    >
      <CardContent className="space-y-3 pt-4">
        {/* Card text or edit area */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="text-sm"
              aria-label={t("editCardText")}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                {tc("save")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                {tc("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {card.text}
          </p>
        )}

        {/* Bottom row: author, votes, actions */}
        <div className="flex items-center justify-between">
          {/* Author */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3" aria-hidden="true" />
            {card.isAnonymous
              ? t("anonymous")
              : card.authorName ?? t("unknown")}
          </div>

          {/* Vote and actions */}
          <div className="flex items-center gap-1">
            {/* Vote button */}
            <Button
              variant={hasVoted ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onVote?.(card.id)}
              aria-label={`${t("vote")} (${card.votes})`}
              aria-pressed={hasVoted}
            >
              <ThumbsUp className="size-3" aria-hidden="true" />
              <span>{card.votes}</span>
            </Button>

            {/* Edit/delete for own cards */}
            {card.isOwnCard && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setIsEditing(true)}
                  aria-label={tc("edit")}
                >
                  <Edit2 className="size-3" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => onDelete?.(card.id)}
                  aria-label={tc("delete")}
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
