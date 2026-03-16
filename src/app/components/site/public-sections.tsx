import { motion } from 'motion/react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { useWebsiteContent } from '../../context/WebsiteContentContext';
import { useOperations } from '../../context/OperationsContext';
import { buildMapLink } from '../../utils/qr';
import { ContactQrTile } from './contact-qr-tile';
import { ScaleAnimation } from './scale-animation';

function SectionFrame({
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
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">{eyebrow}</p>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h2>
        <p className="mt-3 text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
      </div>
      {children}
    </section>
  );
}

function getServiceAccentStyle(from: string, via: string, to: string): CSSProperties {
  return {
    backgroundImage: `linear-gradient(135deg, ${from}, ${via}, ${to})`,
  };
}

export function HeroSection() {
  const { websiteContent } = useWebsiteContent();
  const { createLead } = useOperations();

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-18 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-sm text-amber-200">
            <Sparkles className="h-4 w-4" />
            {websiteContent.hero.eyebrow}
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              {websiteContent.hero.title} <span className="zan-gold-text">{websiteContent.hero.accent}</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">{websiteContent.hero.description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={websiteContent.hero.primaryHref}
              onClick={() =>
                createLead({
                  source: 'consultation-button',
                  comment: 'Клик по кнопке «Получить консультацию»',
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-7 py-4 text-base font-bold text-slate-950 shadow-[0_0_34px_rgba(212,175,55,0.2)]"
            >
              {websiteContent.hero.primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={websiteContent.hero.secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/7 px-7 py-4 text-base font-semibold text-white backdrop-blur"
            >
              {websiteContent.hero.secondaryLabel}
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {websiteContent.stats.map((stat) => (
              <div key={stat.id} className="zan-panel rounded-3xl p-4">
                <p className="text-2xl font-black text-white sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center"
        >
          <div className="relative flex aspect-square w-full max-w-[690px] items-center justify-center">
            <div className="absolute inset-8 rounded-full bg-amber-300/12 blur-3xl" />
            <ScaleAnimation />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function ServicesSection() {
  const { websiteContent } = useWebsiteContent();

  return (
    <SectionFrame
      eyebrow="Услуги"
      title="Юридическая поддержка в ключевых направлениях"
      description="От корпоративных задач до судебной защиты и взыскания задолженности. Каждое направление сопровождается понятным процессом и рабочей стратегией."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {websiteContent.services.map((service, index) => (
          <motion.article
            key={service.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.08 }}
            className="zan-panel rounded-[2rem] p-6"
          >
            <div
              className="mb-5 inline-flex rounded-2xl px-4 py-3 text-slate-950"
              style={getServiceAccentStyle(
                service.accentColors.from,
                service.accentColors.via,
                service.accentColors.to
              )}
            >
              <BriefcaseBusiness className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-white">{service.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{service.description}</p>
            <div className="mt-5 space-y-2">
              {service.bullets.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-100">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </SectionFrame>
  );
}

export function AboutSection() {
  const { websiteContent } = useWebsiteContent();

  return (
    <SectionFrame
      eyebrow="О компании"
      title={websiteContent.company.aboutTitle}
      description={websiteContent.company.aboutText}
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="zan-panel rounded-[2rem] p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10">
              <Building2 className="h-7 w-7 text-amber-300" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Юридическая практика</p>
              <h3 className="text-2xl font-black text-white">{websiteContent.company.name}</h3>
            </div>
          </div>
          <p className="mt-5 text-base leading-8 text-slate-300">
            Мы выстраиваем юридическую работу вокруг интересов клиента: быстро подключаемся к задаче, фиксируем риски,
            собираем позицию и сопровождаем дело до результата.
          </p>
        </div>

        <div className="space-y-4">
          {websiteContent.company.aboutHighlights.map((highlight) => (
            <div key={highlight} className="zan-panel rounded-[1.7rem] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 flex-none text-amber-300" />
                <p className="text-sm leading-7 text-slate-100">{highlight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

export function TeamSection() {
  const { websiteContent } = useWebsiteContent();

  return (
    <SectionFrame
      eyebrow="Команда"
      title="Люди, которые ведут ваши юридические задачи"
      description="Команда ZAN QDM сочетает корпоративную экспертизу, судебную практику и аккуратную работу с документами и переговорами."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {websiteContent.team.map((member, index) => (
          <motion.article
            key={member.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.08 }}
            className="zan-panel rounded-[2rem] p-6"
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
              {member.name.toLowerCase().includes('команда') ? (
                <Users className="h-8 w-8 text-amber-300" />
              ) : (
                <User className="h-8 w-8 text-amber-300" />
              )}
            </div>
            <h3 className="text-2xl font-black text-white">{member.name}</h3>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-amber-200">{member.role}</p>
            <p className="mt-4 text-sm font-medium text-slate-100">{member.specialty}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{member.bio}</p>
          </motion.article>
        ))}
      </div>
    </SectionFrame>
  );
}

export function ContactsSection() {
  const { websiteContent } = useWebsiteContent();
  const { createLead } = useOperations();
  const { contacts } = websiteContent;
  const mapLink = buildMapLink(contacts.latitude, contacts.longitude, `${contacts.city}, ${contacts.address}`);
  const showWhatsappQr = contacts.qrDisplayMode === 'whatsapp' || contacts.qrDisplayMode === 'both';
  const showTelegramQr = contacts.qrDisplayMode === 'telegram' || contacts.qrDisplayMode === 'both';

  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadComment, setLeadComment] = useState('');
  const [leadFeedback, setLeadFeedback] = useState('');

  const submitLead = () => {
    if (!leadName.trim()) {
      setLeadFeedback('Укажите имя, чтобы отправить заявку.');
      return;
    }

    if (!leadPhone.trim() && !leadEmail.trim()) {
      setLeadFeedback('Укажите телефон или email для обратной связи.');
      return;
    }

    createLead({
      name: leadName,
      phone: leadPhone,
      email: leadEmail,
      comment: leadComment,
      source: 'contact-form',
    });

    setLeadName('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadComment('');
    setLeadFeedback('Заявка отправлена. Администратор увидит ее в CRM и свяжется с вами.');
  };

  return (
    <SectionFrame
      eyebrow="Контакты"
      title="Свяжитесь с юридической командой ZAN QDM"
      description="Выберите удобный канал связи, отправьте запрос и получите консультацию по вашей задаче."
    >
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="zan-panel rounded-[2rem] p-7">
            <div className="grid gap-4 md:grid-cols-2">
              <a
                href={`tel:${contacts.phone.replace(/[^+\d]/g, '')}`}
                className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4"
              >
                <div className="mb-2 inline-flex rounded-xl bg-amber-300/14 p-3 text-amber-300">
                  <Phone className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-300">Телефон</p>
                <p className="mt-1 text-lg font-bold text-white">{contacts.phone}</p>
              </a>

              <a
                href={`mailto:${contacts.email}`}
                className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4"
              >
                <div className="mb-2 inline-flex rounded-xl bg-cyan-300/14 p-3 text-cyan-300">
                  <Mail className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-300">Email</p>
                <p className="mt-1 text-lg font-bold text-white">{contacts.email}</p>
              </a>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                href={contacts.whatsappLink || '#'}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  createLead({
                    source: 'whatsapp',
                    comment: 'Переход в WhatsApp с сайта',
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-bold text-white"
              >
                <Send className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={contacts.telegramLink || '#'}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  createLead({
                    source: 'telegram',
                    comment: 'Переход в Telegram с сайта',
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-600 px-5 py-3 text-sm font-bold text-white"
              >
                <Send className="h-4 w-4" />
                Telegram
              </a>
            </div>
          </div>

          <div className="zan-panel rounded-[2rem] p-7">
            <h3 className="text-2xl font-black text-white">Офис и каналы связи</h3>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
              <p>
                <span className="font-semibold text-white">Город:</span> {contacts.city}
              </p>
              <p>
                <span className="font-semibold text-white">Адрес:</span> {contacts.address}
              </p>
              <p>
                <span className="font-semibold text-white">Режим работы:</span> {contacts.officeHours}
              </p>
              {contacts.whatsappLink ? (
                <p>
                  <span className="font-semibold text-white">WhatsApp:</span> {contacts.whatsapp}
                </p>
              ) : null}
              {contacts.telegramLink ? (
                <p>
                  <span className="font-semibold text-white">Telegram:</span> {contacts.telegramLink}
                </p>
              ) : null}
            </div>

            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-amber-200 hover:text-amber-100"
              >
                <MapPin className="h-4 w-4" />
                Открыть офис на карте
              </a>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <div className="zan-panel rounded-[2rem] p-7">
            <h3 className="text-2xl font-black text-white">Оставить заявку</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Администратор компании получит заявку в CRM и сможет взять ее в работу без потери контактов и комментария.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Имя</span>
                <input value={leadName} onChange={(event) => setLeadName(event.target.value)} className="zan-login-input px-4 py-3" placeholder="Как к вам обращаться" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Телефон</span>
                <input value={leadPhone} onChange={(event) => setLeadPhone(event.target.value)} className="zan-login-input px-4 py-3" placeholder="Номер для связи" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Email</span>
                <input value={leadEmail} onChange={(event) => setLeadEmail(event.target.value)} className="zan-login-input px-4 py-3" placeholder="Почта для ответа" />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-200">Комментарий</span>
                <textarea
                  value={leadComment}
                  onChange={(event) => setLeadComment(event.target.value)}
                  className="zan-login-input min-h-[130px] px-4 py-3"
                  placeholder="Кратко опишите задачу"
                />
              </label>
            </div>

            {leadFeedback ? <p className="mt-4 text-sm text-amber-100">{leadFeedback}</p> : null}

            <button
              onClick={submitLead}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-6 py-3 text-sm font-bold text-slate-950"
            >
              <ArrowRight className="h-4 w-4" />
              Отправить заявку
            </button>
          </div>

          {showWhatsappQr || showTelegramQr ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {showWhatsappQr ? (
                <ContactQrTile
                  title="QR WhatsApp"
                  link={contacts.whatsappLink}
                  image={contacts.whatsappQrImage}
                  accentClassName="from-emerald-400/18 via-emerald-500/10 to-transparent"
                  onOpen={() => createLead({ source: 'qr-whatsapp', comment: 'Открыт QR WhatsApp' })}
                />
              ) : null}
              {showTelegramQr ? (
                <ContactQrTile
                  title="QR Telegram"
                  link={contacts.telegramLink}
                  image={contacts.telegramQrImage}
                  accentClassName="from-sky-400/18 via-cyan-400/10 to-transparent"
                  onOpen={() => createLead({ source: 'qr-telegram', comment: 'Открыт QR Telegram' })}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </SectionFrame>
  );
}
