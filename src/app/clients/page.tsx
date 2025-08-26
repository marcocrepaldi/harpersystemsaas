import { Suspense } from 'react';
import ClientsPage from '@/components/clients/ClientsPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4"><div className="h-6 w-40 bg-muted rounded mb-3" /><div className="h-48 w-full bg-muted rounded" /></div>}>
      <ClientsPage />
    </Suspense>
  );
}
