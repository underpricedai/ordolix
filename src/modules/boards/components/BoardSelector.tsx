"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronsUpDown, Plus, Columns3 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

/**
 * Board item in the selector dropdown.
 */
export interface BoardSelectorItem {
  id: string;
  name: string;
  boardType?: string;
}

interface BoardSelectorProps {
  /** List of available boards */
  boards: BoardSelectorItem[];
  /** Currently selected board ID */
  selectedBoardId?: string;
  /** Whether the board list is loading */
  isLoading?: boolean;
  /** Callback when a board is selected */
  onSelect: (boardId: string) => void;
  /** Callback when the create board button is clicked */
  onCreateBoard?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * BoardSelector renders a combobox dropdown for picking a board.
 *
 * @description Shows available boards for the current project with search.
 * Includes a "Create Board" action at the bottom. Uses shadcn/ui Command
 * component for keyboard-accessible selection.
 *
 * @param props - BoardSelectorProps
 * @returns A popover-based board picker
 *
 * @example
 * <BoardSelector
 *   boards={boards}
 *   selectedBoardId="board-1"
 *   onSelect={handleSelect}
 *   onCreateBoard={handleCreate}
 * />
 */
export function BoardSelector({
  boards,
  selectedBoardId,
  isLoading,
  onSelect,
  onCreateBoard,
  className,
}: BoardSelectorProps) {
  const t = useTranslations("boards");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={t("selectBoard")}
          className={cn("w-[240px] justify-between", className)}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <Columns3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">
              {isLoading
                ? tc("loading")
                : selectedBoard
                  ? selectedBoard.name
                  : t("selectBoard")}
            </span>
          </div>
          <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={tc("search")} />
          <CommandList>
            <CommandEmpty>{t("noBoards")}</CommandEmpty>
            <CommandGroup>
              {boards.map((board) => (
                <CommandItem
                  key={board.id}
                  value={board.name}
                  onSelect={() => {
                    onSelect(board.id);
                    setOpen(false);
                  }}
                  className={cn(
                    board.id === selectedBoardId && "bg-accent",
                  )}
                >
                  <Columns3
                    className="mr-2 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{board.name}</span>
                  {board.boardType && (
                    <span className="ms-auto text-xs text-muted-foreground">
                      {board.boardType}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateBoard && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onCreateBoard();
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 size-4" aria-hidden="true" />
                    {t("createBoard")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
