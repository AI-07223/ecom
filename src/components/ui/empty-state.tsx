/**
 * Reusable EmptyState component for displaying empty/cleared states
 * Royal Trading Company - E-commerce Design System
 */

'use client';

import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  /** Icon component to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional label for the action button */
  actionLabel?: string;
  /** Optional href for navigation (renders as Link if provided) */
  actionHref?: string;
  /** Optional click handler for the action button */
  onAction?: () => void;
  /** Additional class names for the container */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  const actionButton = actionLabel && (
    <Button
      asChild={!!actionHref}
      onClick={!actionHref ? onAction : undefined}
      className="h-12 rounded-xl bg-[#2D5A27] hover:bg-[#1E3D1C] text-white px-6"
    >
      {actionHref ? (
        <Link href={actionHref}>{actionLabel}</Link>
      ) : (
        <span>{actionLabel}</span>
      )}
    </Button>
  );

  return (
    <Card
      className={`flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto border-[#E2E0DA] ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#2D5A27]/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#2D5A27]" />
      </div>
      <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{title}</h3>
      <p className="text-sm text-[#6B7280] mb-6">{description}</p>
      {actionButton}
    </Card>
  );
}

export default EmptyState;
