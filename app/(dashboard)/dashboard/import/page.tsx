import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ImportForm } from '@/components/import/import-form';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import CSV Data</h1>
        <p className="text-muted-foreground">
          Paste CSV data for fans, transactions, and messages. Select the
          platform, then click Import. Each CSV is optional — import only the
          types you have data for.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Import</CardTitle>
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
