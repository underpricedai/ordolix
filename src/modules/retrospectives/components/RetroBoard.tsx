"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquarePlus,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { RetroCard, type RetroCardData } from "./RetroCard";

/**
 * Column definition for the retro board.
 */
interface RetroColumn {
  category: string;
  cards: RetroCardData[];
}

interface RetroBoardProps {
  /** Retrospective ID to display */
  retrospectiveId: string;
}

const columnStyles: Record<string, { bg: string; header: string }> = {
  "Went Well": {
    bg: "bg-green-50 dark:bg-green-950/20",
    header: "text-green-700 dark:text-green-400",
  },
  "To Improve": {
    bg: "bg-red-50 dark:bg-red-950/20",
    header: "text-red-700 dark:text-red-400",
  },
  "Action Items": {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    header: "text-blue-700 dark:text-blue-400",
  },
};

/**
 * RetroBoard renders a three-column retrospective board.
 *
 * @description Shows "What went well", "What didn't go well", and "Action items"
 * columns. Each column has cards that can be voted on. Includes add-card inputs
 * at the bottom of each column, anonymous toggle, and a discussion timer.
 *
 * @param props - RetroBoardProps
 * @returns The retro board view
 *
 * @example
 * <RetroBoard retrospectiveId="retro-123" />
 */
export function RetroBoard({ retrospectiveId }: RetroBoardProps) {
  const t = useTranslations("retrospectives");
  const tc = useTranslations("common");
  const isMobile = useIsMobile();

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [newCardTexts, setNewCardTexts] = useState<Record<string, string>>({});

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min default
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tRPC query for retrospective data
  const { data: retroData, isLoading, error } = trpc.retro.getById.useQuery(
    { id: retrospectiveId },
    { enabled: Boolean(retrospectiveId) },
  );

  // tRPC mutations
  const addCardMutation = trpc.retro.addCard.useMutation();
  const voteCardMutation = trpc.retro.voteCard.useMutation();
  const updateCardMutation = trpc.retro.updateCard.useMutation();
  const deleteCardMutation = trpc.retro.deleteCard.useMutation();

  // Parse into columns
  const columns: RetroColumn[] = useMemo(() => {
    if (!retroData) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = retroData as any;
    const categories: string[] = data.categories ?? [
      "Went Well",
      "To Improve",
      "Action Items",
    ];
    const cards: RetroCardData[] = data.cards ?? [];

    return categories.map((cat) => ({
      category: cat,
      cards: cards
        .filter((c: RetroCardData) => c.category === cat)
        .sort((a: RetroCardData, b: RetroCardData) => b.votes - a.votes),
    }));
  }, [retroData]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerSeconds]);

  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleAddCard = useCallback(
    async (category: string) => {
      const text = newCardTexts[category]?.trim();
      if (!text) return;

      await addCardMutation.mutateAsync({
        retrospectiveId,
        category,
        text,
      });

      setNewCardTexts((prev) => ({ ...prev, [category]: "" }));
    },
    [retrospectiveId, newCardTexts, addCardMutation],
  );

  const handleVote = useCallback(
    async (cardId: string) => {
      await voteCardMutation.mutateAsync({ id: cardId });
    },
    [voteCardMutation],
  );

  const handleEdit = useCallback(
    async (cardId: string, text: string) => {
      await updateCardMutation.mutateAsync({ id: cardId, text });
    },
    [updateCardMutation],
  );

  const handleDelete = useCallback(
    async (cardId: string) => {
      await deleteCardMutation.mutateAsync({ id: cardId });
    },
    [deleteCardMutation],
  );

  if (isLoading) {
    return <RetroBoardSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<MessageSquarePlus className="size-12" />}
        title={tc("error")}
        description={tc("retry")}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Top toolbar: timer and anonymous toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-1 pb-4">
        {/* Discussion timer */}
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
          <span
            className={cn(
              "font-mono text-lg font-semibold",
              timerSeconds === 0 && "text-destructive",
              timerRunning && "text-primary",
            )}
            aria-live="polite"
            aria-label={t("timer")}
          >
            {formatTimer(timerSeconds)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTimerRunning((prev) => !prev)}
            aria-label={timerRunning ? t("pauseTimer") : t("startTimer")}
          >
            {timerRunning ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => {
              setTimerRunning(false);
              setTimerSeconds(300);
            }}
            aria-label={t("resetTimer")}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="anonymous-toggle"
            checked={isAnonymous}
            onCheckedChange={setIsAnonymous}
          />
          <Label htmlFor="anonymous-toggle" className="text-sm">
            {t("anonymous")}
          </Label>
        </div>
      </div>

      {/* Columns */}
      {isMobile ? (
        <Tabs defaultValue={columns[0]?.category ?? "Went Well"} className="flex-1">
          <TabsList className="w-full">
            {columns.map((column) => {
              const style = columnStyles[column.category] ?? {
                bg: "bg-muted/20",
                header: "text-foreground",
              };
              return (
                <TabsTrigger key={column.category} value={column.category} className="flex-1">
                  <span className={cn("text-xs font-semibold", style.header)}>
                    {column.category === "Went Well"
                      ? t("wentWell")
                      : column.category === "To Improve"
                        ? t("toImprove")
                        : column.category === "Action Items"
                          ? t("actionItems")
                          : column.category}
                  </span>
                  <Badge variant="secondary" className="ms-1.5 text-xs">
                    {column.cards.length}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {columns.map((column) => {
            const style = columnStyles[column.category] ?? {
              bg: "bg-muted/20",
              header: "text-foreground",
            };
            return (
              <TabsContent key={column.category} value={column.category}>
                <div
                  className={cn("flex flex-col rounded-lg", style.bg)}
                  role="region"
                  aria-label={column.category}
                >
                  <ScrollArea className="flex-1 px-3 pt-3">
                    <div className="space-y-3 pb-3" role="list">
                      {column.cards.map((card) => (
                        <RetroCard
                          key={card.id}
                          card={card}
                          onVote={handleVote}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="border-t px-3 py-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("addCard")}
                        value={newCardTexts[column.category] ?? ""}
                        onChange={(e) =>
                          setNewCardTexts((prev) => ({
                            ...prev,
                            [column.category]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddCard(column.category);
                          }
                        }}
                        className="text-sm"
                        aria-label={`${t("addCard")} - ${column.category}`}
                      />
                      <Button
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() => handleAddCard(column.category)}
                        disabled={!newCardTexts[column.category]?.trim()}
                        aria-label={t("addCard")}
                      >
                        <MessageSquarePlus className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const style = columnStyles[column.category] ?? {
              bg: "bg-muted/20",
              header: "text-foreground",
            };

            return (
              <div
                key={column.category}
                className={cn(
                  "flex w-80 shrink-0 flex-col rounded-lg",
                  style.bg,
                )}
                role="region"
                aria-label={column.category}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <h3
                    className={cn("text-sm font-semibold", style.header)}
                  >
                    {column.category === "Went Well"
                      ? t("wentWell")
                      : column.category === "To Improve"
                        ? t("toImprove")
                        : column.category === "Action Items"
                          ? t("actionItems")
                          : column.category}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {column.cards.length}
                  </Badge>
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1 px-3">
                  <div className="space-y-3 pb-3" role="list">
                    {column.cards.map((card) => (
                      <RetroCard
                        key={card.id}
                        card={card}
                        onVote={handleVote}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Add card input */}
                <div className="border-t px-3 py-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("addCard")}
                      value={newCardTexts[column.category] ?? ""}
                      onChange={(e) =>
                        setNewCardTexts((prev) => ({
                          ...prev,
                          [column.category]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddCard(column.category);
                        }
                      }}
                      className="text-sm"
                      aria-label={`${t("addCard")} - ${column.category}`}
                    />
                    <Button
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() => handleAddCard(column.category)}
                      disabled={
                        !newCardTexts[column.category]?.trim()
                      }
                      aria-label={t("addCard")}
                    >
                      <MessageSquarePlus
                        className="size-4"
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for RetroBoard.
 */
function RetroBoardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex gap-4">
        {Array.from({ length: 3 }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="w-80 shrink-0 space-y-3 rounded-lg bg-muted/20 p-4"
          >
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div key={cardIdx} className="rounded-md border bg-card p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
