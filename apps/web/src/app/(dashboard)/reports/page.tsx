import { ChartColumn } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Reports - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={ChartColumn}
      title="Reports"
      description="Reports will appear here in a later task."
    />
  );
}
