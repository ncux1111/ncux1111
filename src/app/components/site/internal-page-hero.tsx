import type { ReactNode } from 'react';

type InternalPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function InternalPageHero({
  eyebrow,
  title,
  description,
  actions,
}: InternalPageHeroProps) {
  return (
    <section className="zan-panel zan-page-hero rounded-[2rem] p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            {description}
          </p>
        </div>

        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
