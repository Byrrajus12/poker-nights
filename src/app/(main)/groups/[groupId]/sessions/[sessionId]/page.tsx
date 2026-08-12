export default async function SessionPage({
  params,
}: {
  params: Promise<{ groupId: string; sessionId: string }>;
}) {
  const { groupId, sessionId } = await params;
  return (
    <div>
      Session {sessionId} in Group {groupId}
    </div>
  );
}
