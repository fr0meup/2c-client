import { NotFoundCard } from '@/components/not-found/NotFoundCard'
import { CenteredGuidelineShell } from '@/components/not-found/CenteredGuidelineShell'

export function NotFoundPage() {
  return (
    <CenteredGuidelineShell>
      <NotFoundCard type="page" />
    </CenteredGuidelineShell>
  )
}
