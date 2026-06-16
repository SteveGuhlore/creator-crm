import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ImportForm } from '@/components/import/import-form';
import { SandboxSyncForm } from '@/components/import/sandbox-sync-form';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import &amp; Sandbox</h1>
        <p className="text-muted-foreground">
          Bring data in two safe ways — paste real CSV exports, or pull
          synthetic data through the offline sandbox. Neither path touches a
          live platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sandbox sync (mock-live)</CardTitle>
          <CardDescription>
            Generates realistic fans, transactions, and messages locally through
            the <code className="text-xs">MockLiveAdapter</code> — no network,
            no credentials, no scraping. Use it to exercise the full ingestion
            path and test the dashboards. A real OFAuth-style integration would
            later slot in behind the (deferred) live adapter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SandboxSyncForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
          <CardDescription>
            Rows with validation errors are skipped and reported; valid rows are
            always imported. Re-importing the same rows is safe (upsert by
            externalRef).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
