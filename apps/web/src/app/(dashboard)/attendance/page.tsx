import { CalendarCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = { title: 'Attendance - GSC Peoples' };

export default function Page() {
  return (
    <PagePlaceholder
      icon={CalendarCheck}
      title="Attendance"
      description="Attendance records will appear here in a later task."
    />
  );
}
