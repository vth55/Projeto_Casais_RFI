export const filterSessionsByDate = (sessions, filterType) => {
  if (filterType === 'all') return sessions;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return sessions.filter((session) => {
    if (!session.startTime) return false;

    const sessionDate = session.startTime.toDate();

    switch (filterType) {
      case 'today':
        return sessionDate >= today;

      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;

      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return sessionDate >= monthAgo;

      default:
        return true;
    }
  });
};
