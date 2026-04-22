import { EventTable } from '@/components/ads/event-table';
import { Card } from '@/components/ui/card';

export default function EventsPage() {
  return (
    <Card className="p-4">
      <h2 className="mb-4 text-lg font-semibold">Raw events</h2>
      <EventTable />
    </Card>
  );
}
