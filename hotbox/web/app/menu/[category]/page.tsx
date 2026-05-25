import { redirect } from "next/navigation"

/**
 * Legacy category route — collapsed into the single-page menu at `/`.
 * 302-redirect to the section anchor so external deep-links keep
 * working. The new home page uses `<SectionHeader>` whose id is the
 * category slug.
 */
export const dynamic = "force-static"

interface PageProps {
  params: Promise<{ category: string }>
}

export default async function CategoryRedirect({
  params,
}: PageProps): Promise<never> {
  const { category } = await params
  redirect(`/#${category}`)
}
