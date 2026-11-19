import { Settings } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Settings - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={Settings}
      title="Settings"
      description="Workspace settings will appear here in a later task."
    />
  );
}
