import { UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Onboarding - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={UserPlus}
      title="Onboarding"
      description="Onboarding checklists will appear here in a later task."
    />
  );
}
