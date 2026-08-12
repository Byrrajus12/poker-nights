export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <div>New Session {groupId}</div>;
}
