"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const StickyTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
StickyTable.displayName = "StickyTable";

const StickyTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn("[&_tr]:border-b", className)} 
    style={{ position: "sticky", top: 0, zIndex: 100 }}
    {...props} 
  />
));
StickyTableHeader.displayName = "StickyTableHeader";

const StickyTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
StickyTableBody.displayName = "StickyTableBody";

const StickyTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-100",
      className
    )}
    {...props}
  />
));
StickyTableRow.displayName = "StickyTableRow";

const StickyTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    sticky?: boolean;
    stickyLeft?: string | number;
    stickyRight?: string | number;
  }
>(({ className, sticky, stickyLeft, stickyRight, style, ...props }, ref) => {
  const stickyStyle: React.CSSProperties = style ? { ...style } : {};
  
  if (sticky) {
    if (stickyLeft !== undefined) {
      stickyStyle.position = "sticky";
      stickyStyle.left = typeof stickyLeft === "number" ? `${stickyLeft}px` : stickyLeft;
      stickyStyle.zIndex = stickyStyle.zIndex || 101;
      // Only set default background if not provided in style
      if (!stickyStyle.backgroundColor) {
        stickyStyle.backgroundColor = "#ffffff";
      }
    } else if (stickyRight !== undefined) {
      stickyStyle.position = "sticky";
      stickyStyle.right = typeof stickyRight === "number" ? `${stickyRight}px` : stickyRight;
      stickyStyle.zIndex = stickyStyle.zIndex || 101;
      // Only set default background if not provided in style
      if (!stickyStyle.backgroundColor) {
        stickyStyle.backgroundColor = "#ffffff";
      }
    }
  }

  return (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0",
        sticky && stickyLeft !== undefined && "shadow-[2px_0_4px_rgba(0,0,0,0.1)]",
        sticky && stickyRight !== undefined && "shadow-[-2px_0_4px_rgba(0,0,0,0.1)]",
        className
      )}
      style={stickyStyle}
      {...props}
    />
  );
});
StickyTableHead.displayName = "StickyTableHead";

const StickyTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & {
    sticky?: boolean;
    stickyLeft?: string | number;
    stickyRight?: string | number;
  }
>(({ className, sticky, stickyLeft, stickyRight, style, ...props }, ref) => {
  const stickyStyle: React.CSSProperties = style ? { ...style } : {};
  
  if (sticky) {
    if (stickyLeft !== undefined) {
      stickyStyle.position = "sticky";
      stickyStyle.left = typeof stickyLeft === "number" ? `${stickyLeft}px` : stickyLeft;
      stickyStyle.zIndex = stickyStyle.zIndex || 20;
      // Only set default background if not provided in style
      if (!stickyStyle.backgroundColor) {
        stickyStyle.backgroundColor = "#ffffff";
      }
    } else if (stickyRight !== undefined) {
      stickyStyle.position = "sticky";
      stickyStyle.right = typeof stickyRight === "number" ? `${stickyRight}px` : stickyRight;
      stickyStyle.zIndex = stickyStyle.zIndex || 20;
      // Only set default background if not provided in style
      if (!stickyStyle.backgroundColor) {
        stickyStyle.backgroundColor = "#ffffff";
      }
    }
  }

  return (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        sticky && stickyLeft !== undefined && "shadow-[2px_0_4px_rgba(0,0,0,0.1)]",
        sticky && stickyRight !== undefined && "shadow-[-2px_0_4px_rgba(0,0,0,0.1)]",
        className
      )}
      style={stickyStyle}
      {...props}
    />
  );
});
StickyTableCell.displayName = "StickyTableCell";

export {
  StickyTable,
  StickyTableHeader,
  StickyTableBody,
  StickyTableRow,
  StickyTableHead,
  StickyTableCell,
};

