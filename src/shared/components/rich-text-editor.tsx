"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * A mention suggestion item with user ID and display label.
 */
interface MentionItem {
  id: string;
  label: string;
}

/**
 * Props for the RichTextEditor component.
 */
interface RichTextEditorProps {
  /** The HTML content of the editor */
  content: string;
  /** Callback fired when the editor content changes */
  onChange: (html: string) => void;
  /** Placeholder text shown when the editor is empty */
  placeholder?: string;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional function to fetch mention suggestions for @-mentions */
  mentionSuggestions?: (query: string) => Promise<MentionItem[]>;
}

/**
 * MentionList renders a dropdown of user suggestions for @-mentions.
 *
 * @description Displays a floating list of matching users that can be
 * navigated with keyboard (up/down arrows, enter to select) or clicked.
 */
function MentionList({
  items,
  command,
  selectedIndex,
}: {
  items: MentionItem[];
  command: (item: MentionItem) => void;
  selectedIndex: number;
}) {
  const t = useTranslations("richTextEditor");

  if (items.length === 0) {
    return (
      <div className="z-50 rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
        {t("noMentionResults")}
      </div>
    );
  }

  return (
    <div
      className="z-50 min-w-[180px] rounded-md border bg-popover shadow-md"
      role="listbox"
      aria-label={t("mentionSuggestions")}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            "flex w-full items-center px-3 py-1.5 text-sm text-left transition-colors",
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => command(item)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Creates a Tiptap suggestion renderer for @-mentions.
 *
 * @description Returns a render object compatible with Tiptap's suggestion
 * utility. Manages a floating dropdown positioned near the cursor with
 * keyboard navigation (up/down/enter) and mouse click support.
 *
 * @param fetchItems - Async function to fetch matching users for a query
 * @returns A suggestion render configuration
 */
function createMentionSuggestion(
  fetchItems: (query: string) => Promise<MentionItem[]>
) {
  return {
    items: async ({ query }: { query: string }) => {
      return fetchItems(query);
    },
    render: () => {
      let container: HTMLDivElement | null = null;
      let renderRoot: ReturnType<typeof createRoot> | null = null;
      let selectedIndex = 0;
      let currentItems: MentionItem[] = [];
      let currentCommand: ((item: MentionItem) => void) | null = null;

      function updateDOM() {
        if (!container || !renderRoot || !currentCommand) return;

        const commandFn = currentCommand;

        renderRoot.render(
          React.createElement(MentionList, {
            items: currentItems,
            command: commandFn,
            selectedIndex,
          })
        );
      }

      return {
        onStart: (props: SuggestionProps<MentionItem>) => {
          container = document.createElement("div");
          container.style.position = "absolute";
          container.style.zIndex = "9999";

          renderRoot = createRoot(container);

          currentItems = props.items;
          currentCommand = (item: MentionItem) => {
            props.command({ id: item.id, label: item.label });
          };
          selectedIndex = 0;

          updateDOM();

          const rect = props.clientRect?.();
          if (rect) {
            container.style.top = `${rect.bottom + window.scrollY}px`;
            container.style.left = `${rect.left + window.scrollX}px`;
          }

          document.body.appendChild(container);
        },

        onUpdate: (props: SuggestionProps<MentionItem>) => {
          currentItems = props.items;
          currentCommand = (item: MentionItem) => {
            props.command({ id: item.id, label: item.label });
          };
          selectedIndex = 0;

          updateDOM();

          const rect = props.clientRect?.();
          if (rect && container) {
            container.style.top = `${rect.bottom + window.scrollY}px`;
            container.style.left = `${rect.left + window.scrollX}px`;
          }
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
          const { event } = props;

          if (event.key === "ArrowUp") {
            selectedIndex =
              (selectedIndex - 1 + currentItems.length) % currentItems.length;
            updateDOM();
            return true;
          }

          if (event.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % currentItems.length;
            updateDOM();
            return true;
          }

          if (event.key === "Enter") {
            const item = currentItems[selectedIndex];
            if (item && currentCommand) {
              currentCommand(item);
            }
            return true;
          }

          if (event.key === "Escape") {
            return true;
          }

          return false;
        },

        onExit: () => {
          if (renderRoot) {
            renderRoot.unmount();
            renderRoot = null;
          }
          if (container) {
            container.remove();
            container = null;
          }
          currentItems = [];
          currentCommand = null;
          selectedIndex = 0;
        },
      };
    },
  };
}

/**
 * RichTextEditor provides a Tiptap-based WYSIWYG editor with a toolbar.
 *
 * @description A reusable rich text editor component built on Tiptap with
 * support for common formatting (bold, italic, strike, headings, lists,
 * blockquotes, code blocks, links) and optional @-mention suggestions.
 * The toolbar uses icon buttons with active state indicators.
 *
 * @param props - RichTextEditorProps
 * @returns A rich text editor with toolbar and content area
 *
 * @example
 * <RichTextEditor
 *   content="<p>Hello world</p>"
 *   onChange={(html) => setContent(html)}
 *   placeholder="Write something..."
 * />
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder,
  editable = true,
  className,
  mentionSuggestions,
}: RichTextEditorProps) {
  const t = useTranslations("richTextEditor");
  const lastContentRef = useRef(content);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const extensions = [
    StarterKit.configure({
      heading: {
        levels: [1, 2],
      },
    }),
    LinkExtension.configure({
      autolink: true,
      openOnClick: false,
      HTMLAttributes: {
        class: "text-primary underline cursor-pointer",
      },
    }),
    Placeholder.configure({
      placeholder: placeholder ?? t("placeholder"),
    }),
    ...(mentionSuggestions
      ? [
          Mention.configure({
            HTMLAttributes: {
              class: "bg-primary/10 text-primary rounded px-1",
            },
            suggestion: createMentionSuggestion(mentionSuggestions),
          }),
        ]
      : []),
  ];

  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastContentRef.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-3",
      },
    },
  });

  // Sync external content changes (e.g. form reset)
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content;
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Sync editable prop
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  const handleToggleLink = useCallback(() => {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    setShowLinkInput(true);
  }, [editor]);

  const handleSetLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) {
      setShowLinkInput(false);
      setLinkUrl("");
      return;
    }

    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().setLink({ href: url }).run();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("rounded-md border", className)}>
      {/* Toolbar */}
      {editable && (
        <div
          className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1"
          role="toolbar"
          aria-label={t("toolbar")}
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title={t("bold")}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title={t("italic")}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title={t("strikethrough")}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title={t("code")}
          >
            <Code className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
            title={t("heading1")}
          >
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            title={t("heading2")}
          >
            <Heading2 className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title={t("bulletList")}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title={t("orderedList")}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title={t("blockquote")}
          >
            <Quote className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

          <ToolbarButton
            onClick={handleToggleLink}
            active={editor.isActive("link")}
            title={t("link")}
          >
            <Link2 className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            active={false}
            disabled={!editor.can().undo()}
            title={t("undo")}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            active={false}
            disabled={!editor.can().redo()}
            title={t("redo")}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Link URL input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetLink();
              }
              if (e.key === "Escape") {
                setShowLinkInput(false);
                setLinkUrl("");
              }
            }}
            placeholder={t("linkPlaceholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
            aria-label={t("linkPlaceholder")}
          />
          <button
            type="button"
            onClick={handleSetLink}
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            {t("applyLink")}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("cancelLink")}
          </button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * ToolbarButton renders an individual formatting button in the editor toolbar.
 *
 * @description A small icon button with active state styling via data attributes.
 * Used internally by RichTextEditor for each formatting action.
 */
function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      data-active={active}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}
