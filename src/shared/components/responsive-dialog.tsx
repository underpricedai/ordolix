"use client";

import * as React from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/shared/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/shared/components/ui/sheet";

interface ResponsiveDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Renders a Dialog on desktop (md+) and a bottom Sheet on mobile.
 *
 * @description Mirrors Dialog sub-component API for consistent usage.
 * Uses useIsMobile() to determine the rendering mode.
 *
 * @example
 * <ResponsiveDialog open={open} onOpenChange={setOpen}>
 *   <ResponsiveDialogContent>
 *     <ResponsiveDialogHeader>
 *       <ResponsiveDialogTitle>Edit Issue</ResponsiveDialogTitle>
 *     </ResponsiveDialogHeader>
 *     <div>Form content</div>
 *     <ResponsiveDialogFooter>
 *       <Button>Save</Button>
 *     </ResponsiveDialogFooter>
 *   </ResponsiveDialogContent>
 * </ResponsiveDialog>
 */
function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {children}
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}

function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SheetTrigger {...props}>{children}</SheetTrigger>;
  }
  return <DialogTrigger {...props}>{children}</DialogTrigger>;
}

function ResponsiveDialogContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <SheetContent side="bottom" className={`max-h-[85vh] overflow-y-auto ${className ?? ""}`}>
        {children}
      </SheetContent>
    );
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

function ResponsiveDialogHeader({
  children,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SheetHeader {...props}>{children}</SheetHeader>;
  }
  return <DialogHeader {...props}>{children}</DialogHeader>;
}

function ResponsiveDialogTitle({
  children,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SheetTitle {...props}>{children}</SheetTitle>;
  }
  return <DialogTitle {...props}>{children}</DialogTitle>;
}

function ResponsiveDialogDescription({
  children,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SheetDescription {...props}>{children}</SheetDescription>;
  }
  return <DialogDescription {...props}>{children}</DialogDescription>;
}

function ResponsiveDialogFooter({
  children,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SheetFooter {...props}>{children}</SheetFooter>;
  }
  return <DialogFooter {...props}>{children}</DialogFooter>;
}

function ResponsiveDialogClose({
  children,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SheetClose {...props}>{children}</SheetClose>;
  }
  return <DialogClose {...props}>{children}</DialogClose>;
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
};
