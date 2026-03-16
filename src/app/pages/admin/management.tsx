import { useApp } from '../../context/AppContext';
import { AdminPanel } from '../../components/admin-panel';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import { UserAccountManager } from '../../components/admin/user-account-manager';

export function AdminManagement() {
  const {
    employees,
    teams,
    currentUser,
    prizePool,
    pointsHistory,
    handleAddPoints,
    handleUpdateEmployee,
    handleAddEmployee,
    handleDeleteEmployee,
    setPrizePool,
    setPointsHistory,
  } = useApp();

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / Operations"
        title="Управление сотрудниками и доступом"
        description="На этой странице собраны начисления, штрафы, карточки сотрудников и управление учетными записями. CRM-заявки вынесены в отдельную вкладку без изменения данных и storage-логики."
      />

      <AdminPanel
        employees={employees}
        teams={teams}
        onAddPoints={handleAddPoints}
        onUpdateEmployee={handleUpdateEmployee}
        onAddEmployee={handleAddEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        admin={{
          id: currentUser?.id,
          name: currentUser?.name || 'Администратор',
          login: currentUser?.login,
        }}
        prizePool={prizePool}
        onUpdatePrizePool={setPrizePool}
        pointsHistory={pointsHistory}
        onClearHistory={() => setPointsHistory([])}
      />

      <UserAccountManager />
    </div>
  );
}
