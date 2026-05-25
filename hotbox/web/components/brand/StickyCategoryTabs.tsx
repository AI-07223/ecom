/**
 * Horizontal-scroll sticky tab strip that tracks which menu section is
 * currently in view via IntersectionObserver. Tapping a tab smooth-scrolls
 * the section heading to just below the tab strip and updates
 * `location.hash` so deep-links work and the back button restores
 * scroll position.
 *
 * Sentinels are 1px divs rendered inside SectionHeader at
 * `top: var(--sticky-tabs-h)`. We set --sticky-tabs-h here on mount based
 * on the actual rendered tab strip height (which may wrap on narrow
 * viewports), and on resize.
 */
"use client"

import { useEffect, useRef, useState } from "react"
import { CategoryPill } from "./CategoryPill"

interface Tab {
  slug: string
  name: string
}

export function StickyCategoryTabs({
  tabs,
  topOffsetPx = 0,
}: {
  tabs: Tab[]
  /** Pixels of sticky-header above this strip (header + safe-area). */
  topOffsetPx?: number
}): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState<string>(tabs[0]?.slug ?? "")

  // 1. Publish the tab-strip height as a CSS variable so SectionHeader
  //    sentinels can position themselves correctly.
  useEffect(() => {
    const publishHeight = (): void => {
      const h = wrapRef.current?.offsetHeight ?? 56
      document.documentElement.style.setProperty(
        "--sticky-tabs-h",
        `${h + topOffsetPx}px`,
      )
    }
    publishHeight()
    window.addEventListener("resize", publishHeight)
    return () => window.removeEventListener("resize", publishHeight)
  }, [topOffsetPx])

  // 2. Observe section sentinels; whichever crosses the top wins.
  useEffect(() => {
    const sentinels = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section-sentinel]"),
    )
    if (sentinels.length === 0) return

    // Track which sentinels are currently above the viewport top.
    const aboveTop = new Set<string>()
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const slug = (e.target as HTMLElement).dataset.sectionSentinel
          if (!slug) continue
          if (e.boundingClientRect.top < 0) {
            // sentinel is above viewport top -> we're past this section's start
            aboveTop.add(slug)
          } else {
            aboveTop.delete(slug)
          }
        }
        // Active = the LAST sentinel that's above the top (i.e. deepest section).
        // If none, active = first tab.
        const order = sentinels.map((s) => s.dataset.sectionSentinel ?? "")
        let candidate = tabs[0]?.slug ?? ""
        for (const slug of order) {
          if (aboveTop.has(slug)) candidate = slug
        }
        setActive(candidate)
      },
      { rootMargin: "0px 0px -85% 0px", threshold: [0, 1] },
    )
    sentinels.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [tabs])

  // 3. Auto-scroll active tab into the visible region of the strip.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const btn = strip.querySelector<HTMLElement>(`[data-tab-slug="${active}"]`)
    if (!btn) return
    const btnLeft = btn.offsetLeft
    const btnRight = btnLeft + btn.offsetWidth
    const viewLeft = strip.scrollLeft
    const viewRight = viewLeft + strip.clientWidth
    if (btnLeft < viewLeft + 16) {
      strip.scrollTo({ left: btnLeft - 16, behavior: "smooth" })
    } else if (btnRight > viewRight - 16) {
      strip.scrollTo({ left: btnRight - strip.clientWidth + 16, behavior: "smooth" })
    }
  }, [active])

  // 4. Tap-to-jump: scroll the section into view, update hash without
  //    triggering a navigation.
  const onTabClick = (slug: string): void => {
    const target = document.getElementById(slug)
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", `#${slug}`)
  }

  // 5. On mount, honour an existing hash deep-link.
  useEffect(() => {
    if (!window.location.hash) return
    const slug = window.location.hash.slice(1)
    // Wait one frame so the layout has settled.
    requestAnimationFrame(() => {
      const target = document.getElementById(slug)
      if (target) target.scrollIntoView({ behavior: "auto", block: "start" })
    })
  }, [])

  return (
    <div
      ref={wrapRef}
      className="sticky z-30 backdrop-blur"
      style={{
        top: topOffsetPx,
        background: "color-mix(in oklab, var(--color-shell-bg) 88%, transparent)",
        borderBottom: "1px solid var(--color-shell-line)",
      }}
    >
      <nav
        ref={stripRef}
        aria-label="Menu sections"
        className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2 max-w-md mx-auto"
      >
        {tabs.map((t) => (
          <button
            key={t.slug}
            type="button"
            data-tab-slug={t.slug}
            onClick={() => onTabClick(t.slug)}
            aria-current={t.slug === active ? "true" : undefined}
            className="flex-shrink-0"
          >
            <CategoryPill mode="tab" active={t.slug === active}>
              {t.name}
            </CategoryPill>
          </button>
        ))}
      </nav>
    </div>
  )
}
