import { CalendarDays } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Leave - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={CalendarDays}
      title="Leave"
      description="Leave requests and balances will appear here in a later task."
    />
  );
}
