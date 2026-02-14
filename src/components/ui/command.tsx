// Lightweight Command component matching shadcn/ui API surface
// Used for search suggestion dropdowns without requiring cmdk dependency

import * as React from "react";
import { cn } from "@/lib/utils";

const Command = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-[#1A1A1A]",
            className
        )}
        {...props}
    />
));
Command.displayName = "Command";

const CommandList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
        {...props}
    />
));
CommandList.displayName = "CommandList";

const CommandEmpty = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("py-6 text-center text-sm text-[#6B7280]", className)}
        {...props}
    />
));
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { heading?: string }
>(({ className, heading, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("overflow-hidden p-1 text-[#1A1A1A]", className)}
        {...props}
    >
        {heading && (
            <div className="px-2 py-1.5 text-xs font-medium text-[#6B7280]">
                {heading}
            </div>
        )}
        {children}
    </div>
));
CommandGroup.displayName = "CommandGroup";

const CommandItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { onSelect?: () => void }
>(({ className, onSelect, ...props }, ref) => (
    <div
        ref={ref}
        role="option"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
            }
        }}
        className={cn(
            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-[#F0EFE8] focus:bg-[#F0EFE8] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            className
        )}
        {...props}
    />
));
CommandItem.displayName = "CommandItem";

export { Command, CommandList, CommandEmpty, CommandGroup, CommandItem };
