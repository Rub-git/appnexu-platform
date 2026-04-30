import { redirect } from 'next/navigation';

export default async function PwaAppEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pwa/${id}/install`);
}
