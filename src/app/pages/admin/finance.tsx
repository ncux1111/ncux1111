import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp, getRank } from '../../context/AppContext';
import { DollarSign, Edit2, Check, X, Plus, Trash2, EyeOff } from 'lucide-react';
import { Avatar } from '../../components/avatar';
import { InternalPageHero } from '../../components/site/internal-page-hero';

export function AdminFinance() {
  const { employees, teams, services, setServices, handleUpdateEmployee, visibilitySettings } = useApp();

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editSalary, setEditSalary] = useState<string>('');

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceData, setEditServiceData] = useState({ name: '', price: '', category: '' });

  const [isAddingService, setIsAddingService] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', category: '' });

  const getTeamName = (teamId: string) => teams.find((team) => team.id === teamId)?.name || '';

  const categories = useMemo(() => [...new Set(services.map((service) => service.category))], [services]);
  const totalSalaries = employees.reduce((sum, employee) => sum + (employee.salary || 0), 0);

  if (!visibilitySettings.showSalarySection) {
    return (
      <div className="space-y-6">
        <InternalPageHero
          eyebrow="Финансы"
          title="Финансовый блок скрыт"
          description="Раздел с зарплатами и прайс-листом отключён в настройках видимости. При необходимости его можно вернуть из раздела «Настройки»."
        />

        <div className="zan-section-card rounded-[2rem] p-8 text-center">
          <EyeOff className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900">Раздел финансов сейчас скрыт</h2>
          <p className="mt-2 text-slate-600">
            Включите опцию <strong>«Раздел финансы»</strong> в настройках админ-панели, чтобы открыть этот экран.
          </p>
        </div>
      </div>
    );
  }

  const handleStartEditSalary = (employee: any) => {
    setEditingEmployeeId(employee.id);
    setEditSalary(employee.salary?.toString() || '0');
  };

  const handleSaveSalary = (employee: any) => {
    const salary = parseInt(editSalary, 10);
    if (!Number.isNaN(salary) && salary >= 0) {
      void handleUpdateEmployee(employee.id, employee.name, employee.avatar, salary, employee.login);
    }
    setEditingEmployeeId(null);
  };

  const handleStartEditService = (service: any) => {
    setEditingServiceId(service.id);
    setEditServiceData({
      name: service.name,
      price: service.price.toString(),
      category: service.category,
    });
  };

  const handleSaveService = (serviceId: string) => {
    const price = parseInt(editServiceData.price, 10);
    if (!editServiceData.name || Number.isNaN(price) || price < 0 || !editServiceData.category) {
      return;
    }

    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              name: editServiceData.name,
              price,
              category: editServiceData.category,
            }
          : service
      )
    );
    setEditingServiceId(null);
  };

  const handleAddService = () => {
    const price = parseInt(newService.price, 10);
    if (!newService.name || Number.isNaN(price) || price < 0 || !newService.category) {
      return;
    }

    setServices((prev) => [
      ...prev,
      {
        id: `s${Date.now()}`,
        name: newService.name,
        price,
        category: newService.category,
      },
    ]);

    setNewService({ name: '', price: '', category: '' });
    setIsAddingService(false);
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((service) => service.id !== serviceId));
  };

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="Финансы"
        title="Зарплаты и стоимость услуг"
        description="Раздел показывает конфиденциальные финансовые данные: фонд оплаты труда, зарплаты сотрудников и текущий прайс-лист юридических услуг."
      />

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Зарплаты сотрудников</h2>
              <p className="text-sm text-slate-600">Доступно только администраторам</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-600">Общий фонд оплаты труда</p>
            <p className="score-number text-3xl font-black text-blue-700">
              {totalSalaries.toLocaleString('ru-RU')} ₸
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {employees.map((employee) => {
            const rank = getRank(employee.totalPoints);
            const teamColor = teams.find((team) => team.id === employee.teamId)?.color || '#3b82f6';

            return (
              <div key={employee.id} className="rounded-2xl border-2 p-4" style={{ borderColor: teamColor }}>
                {editingEmployeeId === employee.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar avatar={employee.avatar} name={employee.name} className="h-11 w-11 bg-slate-200" />
                      <div>
                        <p className="font-bold text-slate-900">{employee.name}</p>
                        <p className="text-xs text-slate-500">{getTeamName(employee.teamId)}</p>
                      </div>
                    </div>

                    <input
                      type="number"
                      value={editSalary}
                      onChange={(event) => setEditSalary(event.target.value)}
                      className="zan-input w-full px-3 py-2"
                      placeholder="Новая зарплата"
                      autoFocus
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveSalary(employee)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        Сохранить
                      </button>
                      <button
                        onClick={() => setEditingEmployeeId(null)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-slate-600 px-3 py-2 text-sm text-white hover:bg-slate-700"
                      >
                        <X className="h-4 w-4" />
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar avatar={employee.avatar} name={employee.name} className="h-11 w-11 bg-slate-200" />

                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{employee.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="truncate text-xs text-slate-500">{getTeamName(employee.teamId)}</p>
                          <span className="rounded px-2 py-0.5 text-xs text-white" style={{ backgroundColor: rank.color }}>
                            {rank.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="score-number text-2xl font-black text-green-700">
                          {(employee.salary || 0).toLocaleString('ru-RU')} ₸
                        </p>
                        <p className="text-xs text-slate-500">В месяц</p>
                      </div>

                      <button
                        onClick={() => handleStartEditSalary(employee)}
                        className="rounded-xl p-2 text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Прайс-лист услуг</h2>
              <p className="text-sm text-slate-600">Редактирование стоимости юридических услуг</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingService(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Добавить услугу
          </button>
        </div>

        {isAddingService ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border-2 border-green-200 bg-green-50 p-4"
          >
            <h4 className="mb-3 font-bold text-slate-900">Новая услуга</h4>
            <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <input
                type="text"
                value={newService.name}
                onChange={(event) => setNewService({ ...newService, name: event.target.value })}
                className="zan-input px-3 py-2"
                placeholder="Название"
              />
              <input
                type="number"
                value={newService.price}
                onChange={(event) => setNewService({ ...newService, price: event.target.value })}
                className="zan-input px-3 py-2"
                placeholder="Стоимость"
              />
              <input
                type="text"
                value={newService.category}
                onChange={(event) => setNewService({ ...newService, category: event.target.value })}
                className="zan-input px-3 py-2"
                placeholder="Категория"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddService}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 py-2 text-white hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                Сохранить
              </button>
              <button
                onClick={() => {
                  setIsAddingService(false);
                  setNewService({ name: '', price: '', category: '' });
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-600 py-2 text-white hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>
            </div>
          </motion.div>
        ) : null}

        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="mb-2 text-lg font-bold text-slate-900">Категория: {category}</h3>
              <div className="space-y-2">
                {services
                  .filter((service) => service.category === category)
                  .map((service) => (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-slate-200 p-3 transition-colors hover:border-green-300"
                    >
                      {editingServiceId === service.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                            <input
                              type="text"
                              value={editServiceData.name}
                              onChange={(event) =>
                                setEditServiceData({ ...editServiceData, name: event.target.value })
                              }
                              className="zan-input px-3 py-2"
                              placeholder="Название"
                            />
                            <input
                              type="number"
                              value={editServiceData.price}
                              onChange={(event) =>
                                setEditServiceData({ ...editServiceData, price: event.target.value })
                              }
                              className="zan-input px-3 py-2"
                              placeholder="Стоимость"
                            />
                            <input
                              type="text"
                              value={editServiceData.category}
                              onChange={(event) =>
                                setEditServiceData({ ...editServiceData, category: event.target.value })
                              }
                              className="zan-input px-3 py-2"
                              placeholder="Категория"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveService(service.id)}
                              className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-green-600 py-2 text-sm text-white hover:bg-green-700"
                            >
                              <Check className="h-3 w-3" />
                              Сохранить
                            </button>
                            <button
                              onClick={() => setEditingServiceId(null)}
                              className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-slate-600 py-2 text-sm text-white hover:bg-slate-700"
                            >
                              <X className="h-3 w-3" />
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{service.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="score-number text-xl font-black text-green-700">
                              {service.price.toLocaleString('ru-RU')} ₸
                            </p>
                            <button
                              onClick={() => handleStartEditService(service)}
                              className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="rounded p-1 text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
