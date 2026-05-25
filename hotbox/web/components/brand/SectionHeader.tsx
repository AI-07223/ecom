/**
 * Section anchor + CategoryPill. The sentinel above is what the sticky
 * tab strip's IntersectionObserver watches to know which tab to mark
 * active. The id on the wrapper is what `location.hash` jumps to.
 */
import { CategoryPill } from "./CategoryPill"

export function SectionHeader({
  slug,
  name,
}: {
  slug: string
  name: string
}): React.ReactElement {
  return (
    <header id={slug} className="relative scroll-mt-28 pt-8 pb-3">
      {/* 1px sentinel just below the sticky tab strip — IntersectionObserver
          target. Positioned so the StickyCategoryTabs height (computed via
          a CSS custom property at runtime) offsets it correctly. */}
      <div
        aria-hidden="true"
        data-section-sentinel={slug}
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{ top: "var(--sticky-tabs-h, 56px)" }}
      />
      <CategoryPill mode="section">{name}</CategoryPill>
    </header>
  )
}
