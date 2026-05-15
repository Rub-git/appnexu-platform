import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Redirecting',
    description: 'Redirecting to install entry',
  };
}

export default async function AppLaunchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pwa/${id}/install`);
}
