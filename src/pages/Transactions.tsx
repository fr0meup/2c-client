import { usePageLoad, TransactionsSkeleton } from '@/components/skeleton'

export function Transactions() {
  const loading = usePageLoad()

  if (loading) return <TransactionsSkeleton />

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] items-center justify-center xl:-ml-[245px]" style={{ minHeight: 'calc(100vh - 72px - 48px)' }}>
        <p className="text-sm font-medium text-white/40">Coming soon (I'm lying, this is probably never coming.)</p>
      </div>
    </div>
  )
}
