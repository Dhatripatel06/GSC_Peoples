import { LayoutDashboard } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Dashboard - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title="Dashboard"
      description="The dashboard will summarise people metrics once HR data is connected."
    />
  );
}
