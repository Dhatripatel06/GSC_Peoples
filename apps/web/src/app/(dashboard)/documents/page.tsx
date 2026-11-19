import { FileText } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Documents - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={FileText}
      title="Documents"
      description="Employee documents will appear here in a later task."
    />
  );
}
