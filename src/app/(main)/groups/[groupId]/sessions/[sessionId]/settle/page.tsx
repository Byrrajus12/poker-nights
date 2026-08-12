export default async function SettleSessionPage({
  params,
}: {
  params: Promise<{ groupId: string; sessionId: string }>;
}) {
  const { groupId, sessionId } = await params;
  return (
    <div>
      Settle Session {sessionId} in Group {groupId}
    </div>
  );
}
