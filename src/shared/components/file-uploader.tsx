/**
 * FileUploader component for drag-and-drop file uploads.
 *
 * @description Provides a drop zone for uploading file attachments to issues.
 * Uses tRPC addAttachment mutation to create metadata records.
 * Max 25 MB per file.
 *
 * @module file-uploader
 */

"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Upload, Paperclip, X, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/** Maximum file size in bytes (25 MB) */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Formats a file size in bytes to a human-readable string.
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "340 KB", "12 B")
 *
 * @example
 * ```ts
 * formatFileSize(1536) // "1.5 KB"
 * formatFileSize(1048576) // "1.0 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Status of an individual file in the upload queue */
interface FileEntry {
  /** The File object */
  file: File;
  /** Current upload status */
  status: "pending" | "uploading" | "done" | "error";
  /** Error message if status is "error" */
  errorMessage?: string;
}

interface FileUploaderProps {
  /** The issue ID to attach files to */
  issueId: string;
  /** Callback invoked when all uploads complete */
  onUploadComplete?: () => void;
}

/**
 * FileUploader renders a drag-and-drop zone for uploading file attachments to an issue.
 *
 * @description Supports drag-and-drop and click-to-browse. Validates file size
 * (max 25 MB per file). Calls tRPC issue.addAttachment for each file.
 *
 * @param props - FileUploaderProps
 * @returns A file upload zone component
 *
 * @example
 * ```tsx
 * <FileUploader issueId="clxx..." onUploadComplete={() => refetch()} />
 * ```
 */
export function FileUploader({ issueId, onUploadComplete }: FileUploaderProps) {
  const t = useTranslations("attachments");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addAttachment = trpc.issue.addAttachment.useMutation();

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const entries: FileEntry[] = Array.from(newFiles).map((file) => {
        if (file.size > MAX_FILE_SIZE) {
          return { file, status: "error" as const, errorMessage: t("tooLarge") };
        }
        return { file, status: "pending" as const };
      });
      setFiles((prev) => [...prev, ...entries]);
    },
    [t],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset input value so same file can be selected again
      e.target.value = "";
    },
    [addFiles],
  );

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    const pendingIndices = files
      .map((f, i) => (f.status === "pending" ? i : -1))
      .filter((i) => i >= 0);

    if (pendingIndices.length === 0) return;

    // Mark all pending as uploading
    setFiles((prev) =>
      prev.map((f, i) =>
        pendingIndices.includes(i) ? { ...f, status: "uploading" as const } : f,
      ),
    );

    let allSuccess = true;

    for (const idx of pendingIndices) {
      const entry = files[idx];
      if (!entry) continue;

      try {
        await addAttachment.mutateAsync({
          issueId,
          filename: entry.file.name,
          mimeType: entry.file.type || "application/octet-stream",
          size: entry.file.size,
        });

        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, status: "done" as const } : f)),
        );
        console.log(`[FileUploader] ${t("uploadSuccess")}: ${entry.file.name}`);
      } catch (err) {
        allSuccess = false;
        const message = err instanceof Error ? err.message : t("uploadError");
        setFiles((prev) =>
          prev.map((f, i) =>
            i === idx ? { ...f, status: "error" as const, errorMessage: message } : f,
          ),
        );
        console.error(`[FileUploader] ${t("uploadError")}: ${entry.file.name}`, err);
      }
    }

    if (allSuccess && onUploadComplete) {
      onUploadComplete();
    }
  }, [files, addAttachment, issueId, onUploadComplete, t]);

  const hasPendingFiles = files.some((f) => f.status === "pending");
  const isUploading = files.some((f) => f.status === "uploading");

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t("dropzone")}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
      >
        <Upload
          className="mb-2 size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">{t("dropzone")}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">{t("maxSize")}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2" aria-label={t("title")}>
          {files.map((entry, index) => (
            <li
              key={`${entry.file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              {entry.status === "uploading" ? (
                <Loader2
                  className="size-4 shrink-0 animate-spin text-primary"
                  aria-label={t("uploading")}
                />
              ) : (
                <Paperclip
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}

              <span className="min-w-0 flex-1 truncate text-sm">
                {entry.file.name}
              </span>

              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(entry.file.size)}
              </span>

              {entry.status === "error" && (
                <span className="shrink-0 text-xs text-destructive">
                  {entry.errorMessage}
                </span>
              )}

              {entry.status === "done" && (
                <span className="shrink-0 text-xs text-green-600 dark:text-green-400">
                  {t("uploadSuccess")}
                </span>
              )}

              {(entry.status === "pending" || entry.status === "error") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`${t("delete")} ${entry.file.name}`}
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Upload button */}
      {hasPendingFiles && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          size="sm"
        >
          {isUploading ? (
            <>
              <Loader2 className="me-2 size-4 animate-spin" />
              {t("uploading")}
            </>
          ) : (
            t("upload")
          )}
        </Button>
      )}
    </div>
  );
}
