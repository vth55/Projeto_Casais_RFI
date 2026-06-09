export const normalizeIdentity = (value) =>
  value == null ? null : String(value).trim().toLowerCase();

export const sessionBelongsToUser = (session, user) => {
  if (!session || !user) return false;

  const userIds = [
    user.id,
    user.uid,
    user.operatorId,
    user.cardId,
    user.email,
  ].map(normalizeIdentity).filter(Boolean);

  const sessionOperatorId = normalizeIdentity(session.operatorId);
  if (sessionOperatorId && userIds.includes(sessionOperatorId)) return true;

  const sessionOperatorName = normalizeIdentity(session.operatorName);
  const userName = normalizeIdentity(user.name || user.displayName);
  return !!sessionOperatorName && !!userName && sessionOperatorName === userName;
};

export const getVisibleSessionsForUser = (sessions = [], user = null) => {
  if (user?.systemRole !== 'operador') return sessions;
  return sessions.filter(session => sessionBelongsToUser(session, user));
};
