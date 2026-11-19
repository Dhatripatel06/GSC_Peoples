import { Building2 } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Departments - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={Building2}
      title="Departments"
      description="Departments and reporting structure will appear here in a later task."
    />
  );
}
