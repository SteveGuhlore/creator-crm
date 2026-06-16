import { NextResponse } from 'next/server';
import { healthStatus } from '@/lib/health';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(healthStatus());
}
