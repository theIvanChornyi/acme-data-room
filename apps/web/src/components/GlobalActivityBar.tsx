import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export function GlobalActivityBar() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  if (!fetching && !mutating) return null;
  return <div className="pointer-events-none fixed inset-x-0 top-16 z-50 h-0.5 overflow-hidden bg-brand/10" role="status" aria-label="Updating workspace"><div className="global-activity-bar h-full w-2/5 bg-brand" /></div>;
}
