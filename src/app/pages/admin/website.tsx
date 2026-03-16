import { motion } from 'motion/react';
import {
  Blocks,
  Building2,
  Clock3,
  ImagePlus,
  MapPin,
  Mail,
  MessageCircle,
  Monitor,
  Phone,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { fileToDataUrl } from '../../components/avatar';
import { ContactQrTile } from '../../components/site/contact-qr-tile';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import {
  type PublicServiceCard,
  type PublicServiceGradient,
  type PublicStat,
  type PublicTeamMember,
  type WebsiteContent,
  useWebsiteContent,
} from '../../context/WebsiteContentContext';
import { buildMapLink } from '../../utils/qr';

function cloneContent(content: WebsiteContent) {
  return JSON.parse(JSON.stringify(content)) as WebsiteContent;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="zan-panel-light rounded-[2rem] p-6"
    >
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </motion.section>
  );
}

function InputField({
  label,
  value,
  onChange,
  multiline = false,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  helper?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="zan-textarea min-h-[110px] px-4 py-3 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="zan-input px-4 py-3 text-sm"
        />
      )}
      {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="zan-input h-11 flex-1 px-4 text-sm"
        />
      </div>
    </label>
  );
}

function getServiceAccentStyle(colors: PublicServiceGradient) {
  return {
    backgroundImage: `linear-gradient(135deg, ${colors.from}, ${colors.via}, ${colors.to})`,
  };
}

function PreviewBlock({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#090f1f] shadow-[0_24px_48px_rgba(15,23,42,0.14)]">
      <div className="border-b border-white/10 px-6 py-5 text-white">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-black">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function PreviewHint({
  title = 'Предпросмотр',
  description = 'Как это увидит клиент на публичном сайте.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-600">
        <Monitor className="h-3.5 w-3.5" />
        Вид клиента
      </div>
    </div>
  );
}

function HeroPreview({ draft }: { draft: WebsiteContent }) {
  return (
    <PreviewBlock
      eyebrow="Как это увидит клиент"
      title="Главная секция"
      description="Широкий preview hero без мобильной компрессии. Здесь сразу видно иерархию текста, CTA и общую плотность первого экрана."
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.9rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_34%),rgba(15,23,42,0.82)] p-7 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/80">{draft.hero.eyebrow}</p>
          <div className="mt-5 max-w-3xl space-y-4">
            <h4 className="text-[clamp(2rem,3vw,3.8rem)] font-black leading-[1.04]">
              {draft.hero.title} <span className="zan-gold-text">{draft.hero.accent}</span>
            </h4>
            <p className="max-w-2xl text-base leading-8 text-slate-300">{draft.hero.description}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_18px_30px_rgba(245,158,11,0.2)]">
              {draft.hero.primaryLabel}
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/6 px-5 py-3 text-sm font-semibold text-white">
              {draft.hero.secondaryLabel}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
          {draft.stats.slice(0, 3).map((stat) => (
            <div key={stat.id} className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5 text-white">
              <p className="text-3xl font-black">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </PreviewBlock>
  );
}

function ServiceCardPreview({
  service,
  compact = false,
}: {
  service: PublicServiceCard;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-slate-950 shadow-[0_18px_32px_rgba(15,23,42,0.14)]">
      <div className="h-2 w-full" style={getServiceAccentStyle(service.accentColors)} />
      <div className={`${compact ? 'space-y-4 p-5' : 'space-y-5 p-6'} text-white`}>
        <div
          className={`${compact ? 'rounded-2xl px-4 py-3' : 'rounded-[1.4rem] px-4 py-3.5'} inline-flex text-slate-950`}
          style={getServiceAccentStyle(service.accentColors)}
        >
          <ImagePlus className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
        </div>
        <div>
          <p className={compact ? 'text-xl font-black' : 'text-2xl font-black'}>{service.title}</p>
          <p className={`${compact ? 'mt-2 text-sm leading-7' : 'mt-3 text-base leading-8'} text-slate-300`}>
            {service.description}
          </p>
        </div>
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {service.bullets.slice(0, 3).map((bullet) => (
            <div
              key={bullet}
              className={`${compact ? 'rounded-2xl px-3 py-2 text-sm' : 'rounded-[1.2rem] px-4 py-3 text-[0.95rem]'} border border-white/10 bg-white/5 text-slate-200`}
            >
              {bullet}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesPreview({ draft }: { draft: WebsiteContent }) {
  return (
    <PreviewBlock
      eyebrow="Как это увидит клиент"
      title="Карточки услуг"
      description="Карточки показаны в той плотности, в которой они считываются на сайте. Здесь удобно оценивать градиент, текст и преимущества без узкой боковой колонки."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {draft.services.map((service) => (
          <ServiceCardPreview key={service.id} service={service} />
        ))}
      </div>
    </PreviewBlock>
  );
}

function TeamPreview({ draft }: { draft: WebsiteContent }) {
  return (
    <PreviewBlock
      eyebrow="Как это увидит клиент"
      title="Блок команды"
      description="Крупные карточки показывают имя, роль, специализацию и короткое описание так, как это будет восприниматься клиентом на сайте."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {draft.team.map((member) => (
          <div key={member.id} className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-lg font-black text-amber-200">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-black">{member.name}</p>
                <p className="mt-1 text-sm text-slate-300">{member.role}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-cyan-200/80">{member.specialty}</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">{member.bio}</p>
          </div>
        ))}
      </div>
    </PreviewBlock>
  );
}

function ContactPreview({ draft }: { draft: WebsiteContent }) {
  const mapLink = buildMapLink(
    draft.contacts.latitude,
    draft.contacts.longitude,
    `${draft.contacts.city}, ${draft.contacts.address}`
  );

  const showWhatsappQr =
    draft.contacts.qrDisplayMode === 'whatsapp' || draft.contacts.qrDisplayMode === 'both';
  const showTelegramQr =
    draft.contacts.qrDisplayMode === 'telegram' || draft.contacts.qrDisplayMode === 'both';

  return (
    <PreviewBlock
      eyebrow="Как это увидит клиент"
      title="Контакты и QR"
      description="Крупный контактный блок с адресом, режимом работы, ссылками и QR-кодами. Здесь уже видно, не слишком ли плотный или мелкий контент."
    >
      <div className="grid gap-5 xl:grid-cols-[1.05fr_1.15fr]">
        <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-white/6 p-6 text-white">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-300" />
            <p className="text-lg font-black">{draft.contacts.city}</p>
          </div>
          <p className="text-base text-slate-200">{draft.contacts.address}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <Clock3 className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">График</p>
              </div>
              <p className="mt-2 text-sm text-slate-100">{draft.contacts.officeHours}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <Phone className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Телефон</p>
              </div>
              <p className="mt-2 text-sm text-slate-100">{draft.contacts.phone}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <Mail className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Email</p>
              </div>
              <p className="mt-2 text-sm text-slate-100">{draft.contacts.email}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <MessageCircle className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Мессенджер</p>
              </div>
              <p className="mt-2 text-sm text-slate-100">{draft.contacts.whatsapp}</p>
            </div>
          </div>
          {mapLink ? (
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/15"
            >
              <MapPin className="h-4 w-4" />
              Открыть на карте
            </a>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {showWhatsappQr ? (
            <ContactQrTile
              title="QR WhatsApp"
              link={draft.contacts.whatsappLink}
              image={draft.contacts.whatsappQrImage}
              accentClassName="from-emerald-400/18 via-emerald-500/10 to-transparent"
              size="large"
            />
          ) : null}
          {showTelegramQr ? (
            <ContactQrTile
              title="QR Telegram"
              link={draft.contacts.telegramLink}
              image={draft.contacts.telegramQrImage}
              accentClassName="from-sky-400/18 via-cyan-400/10 to-transparent"
              size="large"
            />
          ) : null}
          {!showWhatsappQr && !showTelegramQr ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-[1.8rem] border border-dashed border-white/12 bg-white/5 px-6 text-center text-sm text-slate-300 md:col-span-2">
              QR-коды скрыты. Выберите режим показа ниже или загрузите изображения вручную.
            </div>
          ) : null}
        </div>
      </div>
    </PreviewBlock>
  );
}

function SiteOverviewCanvas({ draft }: { draft: WebsiteContent }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_28%),rgba(15,23,42,0.86)] p-7 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/80">{draft.hero.eyebrow}</p>
        <div className="mt-4 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <h4 className="text-[clamp(2rem,2.7vw,3.4rem)] font-black leading-[1.06]">
              {draft.hero.title} <span className="zan-gold-text">{draft.hero.accent}</span>
            </h4>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{draft.hero.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950">
                {draft.hero.primaryLabel}
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/6 px-5 py-3 text-sm font-semibold text-white">
                {draft.hero.secondaryLabel}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            {draft.stats.slice(0, 3).map((stat) => (
              <div key={stat.id} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-white">
            <Blocks className="h-5 w-5 text-cyan-200" />
            <p className="text-lg font-black">Карточки услуг</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {draft.services.slice(0, 4).map((service) => (
              <ServiceCardPreview key={service.id} service={service} compact />
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-cyan-200" />
            <p className="text-lg font-black">Команда и контакты</p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {draft.team.slice(0, 2).map((member) => (
                <div key={member.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-white">
                  <p className="text-lg font-black">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{member.role}</p>
                  <p className="mt-3 text-sm font-semibold text-cyan-200/80">{member.specialty}</p>
                </div>
              ))}
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-white">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-300" />
                    <p className="text-sm font-semibold">{draft.contacts.city}</p>
                  </div>
                  <p className="text-sm text-slate-300">{draft.contacts.address}</p>
                  <p className="text-sm text-slate-300">{draft.contacts.officeHours}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-slate-100">{draft.contacts.phone}</p>
                  <p className="text-sm text-slate-100">{draft.contacts.email}</p>
                  <p className="text-sm text-slate-300">{draft.contacts.whatsapp}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteOverviewPreview({ draft }: { draft: WebsiteContent }) {
  const devices = [
    {
      key: 'desktop',
      label: 'Desktop',
      icon: Monitor,
      width: 1240,
      scaleClassName: 'scale-[0.36] md:scale-[0.46] xl:scale-[0.58]',
      viewportClassName: 'h-[330px] md:h-[420px] xl:h-[520px]',
    },
    {
      key: 'tablet',
      label: 'Tablet',
      icon: Tablet,
      width: 768,
      scaleClassName: 'scale-[0.42] md:scale-[0.58] xl:scale-[0.72]',
      viewportClassName: 'h-[360px] md:h-[450px] xl:h-[590px]',
    },
    {
      key: 'mobile',
      label: 'Mobile',
      icon: Smartphone,
      width: 375,
      scaleClassName: 'scale-[0.72] md:scale-[0.84] xl:scale-[0.95]',
      viewportClassName: 'h-[430px] md:h-[500px] xl:h-[560px]',
    },
  ] as const;

  return (
    <PreviewBlock
      eyebrow="Общий предпросмотр сайта"
      title="Как выглядит публичная главная"
      description="Композиционный preview без эмуляции браузера: hero, услуги, команда и контакты собраны в один крупный блок, чтобы админ видел цельный образ страницы."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        {devices.map((device) => {
          const Icon = device.icon;

          return (
            <div key={device.key} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Icon className="h-4 w-4" />
                {device.label}
              </div>
              <div className={`overflow-hidden rounded-[1.8rem] border border-slate-200 bg-slate-100/80 p-3 shadow-inner ${device.viewportClassName}`}>
                <div
                  className={`${device.scaleClassName} origin-top-left transition-transform`}
                  style={{ width: `${device.width}px` }}
                >
                  <SiteOverviewCanvas draft={draft} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Один и тот же preview рендерится в трёх контейнерах с разной шириной: desktop, tablet и mobile. Логика сайта не меняется.
      </div>
    </PreviewBlock>
  );
}

export function AdminWebsite() {
  const { websiteContent, setWebsiteContent } = useWebsiteContent();
  const [draft, setDraft] = useState<WebsiteContent>(() => cloneContent(websiteContent));

  useEffect(() => {
    setDraft(cloneContent(websiteContent));
  }, [websiteContent]);

  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(websiteContent),
    [draft, websiteContent]
  );

  const updateStat = (statId: string, updater: (previous: PublicStat) => PublicStat) => {
    setDraft((previous) => ({
      ...previous,
      stats: previous.stats.map((item) => (item.id === statId ? updater(item) : item)),
    }));
  };

  const updateService = (serviceId: string, updater: (previous: PublicServiceCard) => PublicServiceCard) => {
    setDraft((previous) => ({
      ...previous,
      services: previous.services.map((item) => (item.id === serviceId ? updater(item) : item)),
    }));
  };

  const updateServiceColors = (serviceId: string, key: keyof PublicServiceGradient, value: string) => {
    updateService(serviceId, (previous) => {
      const accentColors = {
        ...previous.accentColors,
        [key]: value,
      };

      return {
        ...previous,
        accentColors,
        accent: `${accentColors.from}|${accentColors.via}|${accentColors.to}`,
      };
    });
  };

  const updateTeamMember = (memberId: string, updater: (previous: PublicTeamMember) => PublicTeamMember) => {
    setDraft((previous) => ({
      ...previous,
      team: previous.team.map((item) => (item.id === memberId ? updater(item) : item)),
    }));
  };

  const updateContacts = (patch: Partial<WebsiteContent['contacts']>) => {
    setDraft((previous) => ({
      ...previous,
      contacts: {
        ...previous.contacts,
        ...patch,
      },
    }));
  };

  const handleUploadQr = async (
    kind: 'whatsappQrImage' | 'telegramQrImage',
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      alert('Загрузите PNG, JPG, JPEG или WEBP для QR-кода.');
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    updateContacts({ [kind]: dataUrl });
  };

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / Admin"
        title="Контент и бренд публичного сайта"
        description="Здесь редактируются тексты сайта, карточки услуг, контакты, геоданные и QR-блок. Все изменения сразу применяются на публичных маршрутах."
        actions={
          <>
            <button
              onClick={() => setDraft(cloneContent(websiteContent))}
              className="zan-toolbar-button zan-toolbar-button-secondary"
            >
              <RotateCcw className="h-4 w-4" />
              Отменить
            </button>
            <button
              onClick={() => setWebsiteContent(cloneContent(draft))}
              disabled={!hasChanges}
              className="zan-toolbar-button zan-toolbar-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Сохранить изменения
            </button>
          </>
        }
      />

      <SectionCard
        title="Компания и hero"
        description="Название бренда, главный экран и основные тексты публичного сайта."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <InputField
            label="Название компании"
            value={draft.company.name}
            onChange={(value) => setDraft((previous) => ({ ...previous, company: { ...previous.company, name: value } }))}
          />
          <InputField
            label="Короткое название"
            value={draft.company.shortName}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, company: { ...previous.company, shortName: value } }))
            }
          />
          <InputField
            label="Слоган"
            value={draft.company.tagline}
            onChange={(value) => setDraft((previous) => ({ ...previous, company: { ...previous.company, tagline: value } }))}
          />
          <InputField
            label="Подзаголовок hero"
            value={draft.hero.eyebrow}
            onChange={(value) => setDraft((previous) => ({ ...previous, hero: { ...previous.hero, eyebrow: value } }))}
          />
          <InputField
            label="Заголовок hero"
            value={draft.hero.title}
            onChange={(value) => setDraft((previous) => ({ ...previous, hero: { ...previous.hero, title: value } }))}
          />
          <InputField
            label="Акцент hero"
            value={draft.hero.accent}
            onChange={(value) => setDraft((previous) => ({ ...previous, hero: { ...previous.hero, accent: value } }))}
          />
          <div className="lg:col-span-2">
            <InputField
              label="Описание hero"
              value={draft.hero.description}
              onChange={(value) =>
                setDraft((previous) => ({ ...previous, hero: { ...previous.hero, description: value } }))
              }
              multiline
            />
          </div>
          <InputField
            label="Текст первой кнопки"
            value={draft.hero.primaryLabel}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, hero: { ...previous.hero, primaryLabel: value } }))
            }
          />
          <InputField
            label="Ссылка первой кнопки"
            value={draft.hero.primaryHref}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, hero: { ...previous.hero, primaryHref: value } }))
            }
          />
          <InputField
            label="Текст второй кнопки"
            value={draft.hero.secondaryLabel}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, hero: { ...previous.hero, secondaryLabel: value } }))
            }
          />
          <InputField
            label="Ссылка второй кнопки"
            value={draft.hero.secondaryHref}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, hero: { ...previous.hero, secondaryHref: value } }))
            }
          />
        </div>

        <div className="mt-8">
          <PreviewHint
            title="Предпросмотр hero"
            description="Широкий preview первого экрана. Здесь уже видно, как клиент считывает заголовок, акцент, кнопки и метрики."
          />
          <HeroPreview draft={draft} />
        </div>
      </SectionCard>

      <SectionCard
        title="О компании"
        description="Тексты, которые формируют клиентское позиционирование юридической компании."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <InputField
            label="Заголовок блока"
            value={draft.company.aboutTitle}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, company: { ...previous.company, aboutTitle: value } }))
            }
          />
          <div className="lg:col-span-2">
            <InputField
              label="Описание компании"
              value={draft.company.aboutText}
              onChange={(value) =>
                setDraft((previous) => ({ ...previous, company: { ...previous.company, aboutText: value } }))
              }
              multiline
            />
          </div>
          <div className="lg:col-span-2">
            <InputField
              label="Преимущества, по одному на строку"
              value={draft.company.aboutHighlights.join('\n')}
              onChange={(value) =>
                setDraft((previous) => ({
                  ...previous,
                  company: {
                    ...previous.company,
                    aboutHighlights: value
                      .split('\n')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                }))
              }
              multiline
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Статистика и услуги"
        description="Публичные метрики и карточки услуг с понятной настройкой цвета и живым предпросмотром."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">Статистика</h3>
              <button
                onClick={() =>
                  setDraft((previous) => ({
                    ...previous,
                    stats: [...previous.stats, { id: `stat-${Date.now()}`, value: '0+', label: 'Новая метрика' }],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <Plus className="h-3 w-3" />
                Добавить метрику
              </button>
            </div>

            {draft.stats.map((stat) => (
              <div key={stat.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[120px_1fr_auto]">
                <InputField
                  label="Значение"
                  value={stat.value}
                  onChange={(value) => updateStat(stat.id, (previous) => ({ ...previous, value }))}
                />
                <InputField
                  label="Подпись"
                  value={stat.label}
                  onChange={(value) => updateStat(stat.id, (previous) => ({ ...previous, label: value }))}
                />
                <button
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      stats: previous.stats.filter((item) => item.id !== stat.id),
                    }))
                  }
                  className="mt-7 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">Услуги</h3>
              <button
                onClick={() =>
                  setDraft((previous) => ({
                    ...previous,
                    services: [
                      ...previous.services,
                      {
                        id: `service-${Date.now()}`,
                        title: 'Новая услуга',
                        description: 'Короткое описание услуги.',
                        bullets: ['Преимущество 1', 'Преимущество 2'],
                        accentColors: {
                          from: '#f5c34d',
                          via: '#f59e0b',
                          to: '#ea580c',
                        },
                        accent: '#f5c34d|#f59e0b|#ea580c',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <Plus className="h-3 w-3" />
                Добавить услугу
              </button>
            </div>

            {draft.services.map((service) => (
              <div key={service.id} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">Карточка услуги</p>
                  <button
                    onClick={() =>
                      setDraft((previous) => ({
                        ...previous,
                        services: previous.services.filter((item) => item.id !== service.id),
                      }))
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4">
                  <InputField
                    label="Название услуги"
                    value={service.title}
                    onChange={(value) => updateService(service.id, (previous) => ({ ...previous, title: value }))}
                  />
                  <InputField
                    label="Описание услуги"
                    value={service.description}
                    onChange={(value) =>
                      updateService(service.id, (previous) => ({ ...previous, description: value }))
                    }
                    multiline
                  />

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-slate-900">Цвет карточки</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Это цветовой стиль карточки услуги на публичном сайте.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <ColorInput
                        label="Начальный цвет"
                        value={service.accentColors.from}
                        onChange={(value) => updateServiceColors(service.id, 'from', value)}
                      />
                      <ColorInput
                        label="Средний цвет"
                        value={service.accentColors.via}
                        onChange={(value) => updateServiceColors(service.id, 'via', value)}
                      />
                      <ColorInput
                        label="Конечный цвет"
                        value={service.accentColors.to}
                        onChange={(value) => updateServiceColors(service.id, 'to', value)}
                      />
                    </div>
                  </div>

                  <InputField
                    label="Преимущества, по одному на строку"
                    value={service.bullets.join('\n')}
                    onChange={(value) =>
                      updateService(service.id, (previous) => ({
                        ...previous,
                        bullets: value
                          .split('\n')
                          .map((item) => item.trim())
                          .filter(Boolean),
                      }))
                    }
                    multiline
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <PreviewHint
            title="Как это выглядит на сайте"
            description="Крупный живой preview карточек услуг. Изменения текста, градиента и преимуществ сразу читаются без узкой боковой колонки."
          />
          <ServicesPreview draft={draft} />
        </div>
      </SectionCard>

      <SectionCard
        title="Команда и контакты"
        description="Публичная команда компании, адрес офиса, геоданные и QR-коды мессенджеров."
      >
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">Команда</h3>
              <button
                onClick={() =>
                  setDraft((previous) => ({
                    ...previous,
                    team: [
                      ...previous.team,
                      {
                        id: `team-${Date.now()}`,
                        name: 'Новый участник',
                        role: 'Юрист',
                        specialty: 'Специализация',
                        bio: 'Короткое описание участника команды.',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <Plus className="h-3 w-3" />
                Добавить участника
              </button>
            </div>

            {draft.team.map((member) => (
              <div key={member.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Карточка юриста</p>
                  <button
                    onClick={() =>
                      setDraft((previous) => ({
                        ...previous,
                        team: previous.team.filter((item) => item.id !== member.id),
                      }))
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <InputField
                  label="Имя"
                  value={member.name}
                  onChange={(value) => updateTeamMember(member.id, (previous) => ({ ...previous, name: value }))}
                />
                <InputField
                  label="Роль"
                  value={member.role}
                  onChange={(value) => updateTeamMember(member.id, (previous) => ({ ...previous, role: value }))}
                />
                <InputField
                  label="Специализация"
                  value={member.specialty}
                  onChange={(value) =>
                    updateTeamMember(member.id, (previous) => ({ ...previous, specialty: value }))
                  }
                />
                <InputField
                  label="Биография"
                  value={member.bio}
                  onChange={(value) => updateTeamMember(member.id, (previous) => ({ ...previous, bio: value }))}
                  multiline
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <InputField label="Телефон" value={draft.contacts.phone} onChange={(value) => updateContacts({ phone: value })} />
              <InputField label="Email" value={draft.contacts.email} onChange={(value) => updateContacts({ email: value })} />
              <InputField
                label="WhatsApp (подпись)"
                value={draft.contacts.whatsapp}
                onChange={(value) => updateContacts({ whatsapp: value })}
              />
              <InputField label="Город" value={draft.contacts.city} onChange={(value) => updateContacts({ city: value })} />
              <div className="lg:col-span-2">
                <InputField
                  label="Адрес офиса"
                  value={draft.contacts.address}
                  onChange={(value) => updateContacts({ address: value })}
                  multiline
                />
              </div>
              <InputField
                label="Режим работы"
                value={draft.contacts.officeHours}
                onChange={(value) => updateContacts({ officeHours: value })}
              />
              <InputField
                label="Ссылка WhatsApp"
                value={draft.contacts.whatsappLink}
                onChange={(value) => updateContacts({ whatsappLink: value })}
                helper="Если QR не загружен вручную, он будет сгенерирован из этой ссылки."
              />
              <InputField
                label="Ссылка Telegram"
                value={draft.contacts.telegramLink}
                onChange={(value) => updateContacts({ telegramLink: value })}
                helper="Можно показать на сайте QR Telegram вместо или вместе с WhatsApp."
              />
              <InputField label="Широта" value={draft.contacts.latitude} onChange={(value) => updateContacts({ latitude: value })} />
              <InputField label="Долгота" value={draft.contacts.longitude} onChange={(value) => updateContacts({ longitude: value })} />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-slate-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">QR и контактный блок</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Выберите, какие QR показывать на сайте, и при необходимости загрузите свои изображения.
                  </p>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Что показывать на сайте</span>
                <select
                  value={draft.contacts.qrDisplayMode}
                  onChange={(event) =>
                    updateContacts({
                      qrDisplayMode: event.target.value as WebsiteContent['contacts']['qrDisplayMode'],
                    })
                  }
                  className="zan-select h-11 px-4 text-sm"
                >
                  <option value="none">Не показывать QR</option>
                  <option value="whatsapp">Только WhatsApp</option>
                  <option value="telegram">Только Telegram</option>
                  <option value="both">Показывать оба</option>
                </select>
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                    <p className="font-semibold text-slate-900">QR WhatsApp</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                    <Upload className="h-4 w-4" />
                    Загрузить изображение
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={(event) => void handleUploadQr('whatsappQrImage', event)}
                    />
                  </label>
                  <button
                    onClick={() => updateContacts({ whatsappQrImage: null })}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700"
                  >
                    Удалить загруженный QR
                  </button>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-sky-600" />
                    <p className="font-semibold text-slate-900">QR Telegram</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                    <Upload className="h-4 w-4" />
                    Загрузить изображение
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={(event) => void handleUploadQr('telegramQrImage', event)}
                    />
                  </label>
                  <button
                    onClick={() => updateContacts({ telegramQrImage: null })}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700"
                  >
                    Удалить загруженный QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <PreviewHint
            title="Предпросмотр команды"
            description="Крупные карточки участников в пропорциях публичного сайта, чтобы визуально проверить имена, роли и специализации."
          />
          <TeamPreview draft={draft} />
        </div>

        <div className="mt-8">
          <PreviewHint
            title="Предпросмотр контактов"
            description="Широкий контактный блок с адресом, геоданными и QR-кодами в комфортном размере для чтения."
          />
          <ContactPreview draft={draft} />
        </div>
      </SectionCard>

      <SiteOverviewPreview draft={draft} />
    </div>
  );
}
