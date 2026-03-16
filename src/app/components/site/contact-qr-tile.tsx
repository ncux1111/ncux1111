import { useEffect, useState } from 'react';
import { ExternalLink, QrCode } from 'lucide-react';
import { generateQrDataUrl } from '../../utils/qr';

interface ContactQrTileProps {
  title: string;
  link?: string;
  image?: string | null;
  accentClassName?: string;
  onOpen?: () => void;
  size?: 'default' | 'large';
}

export function ContactQrTile({
  title,
  link,
  image,
  accentClassName = 'from-amber-300/16 via-amber-300/8 to-transparent',
  onOpen,
  size = 'default',
}: ContactQrTileProps) {
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);

  const tileClassName = size === 'large' ? 'rounded-[1.8rem] p-5' : 'rounded-[1.6rem] p-4';
  const previewFrameClassName =
    size === 'large'
      ? 'mt-4 flex min-h-[240px] items-center justify-center rounded-[1.45rem] border border-white/10 bg-slate-950/45 p-6'
      : 'mt-4 flex min-h-[190px] items-center justify-center rounded-[1.35rem] border border-white/10 bg-slate-950/45 p-4';
  const qrImageClassName = size === 'large' ? 'h-48 w-48 rounded-[1.35rem] object-contain' : 'h-40 w-40 rounded-2xl object-contain';
  const titleClassName = size === 'large' ? 'text-base font-semibold text-white' : 'text-sm font-semibold text-white';

  useEffect(() => {
    let cancelled = false;

    const loadQr = async () => {
      if (image) {
        setGeneratedQr(image);
        return;
      }

      if (!link?.trim()) {
        setGeneratedQr(null);
        return;
      }

      const next = await generateQrDataUrl(link);
      if (!cancelled) {
        setGeneratedQr(next);
      }
    };

    void loadQr();
    return () => {
      cancelled = true;
    };
  }, [image, link]);

  return (
    <div className={`${tileClassName} border border-white/10 bg-gradient-to-br ${accentClassName}`}>
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-amber-300" />
        <p className={titleClassName}>{title}</p>
      </div>

      <div className={previewFrameClassName}>
        {generatedQr ? (
          link?.trim() ? (
            <a href={link} target="_blank" rel="noreferrer" onClick={onOpen} className="inline-flex">
              <img src={generatedQr} alt={title} className={qrImageClassName} />
            </a>
          ) : (
            <img src={generatedQr} alt={title} className={qrImageClassName} />
          )
        ) : (
          <div className="text-center text-sm text-slate-300">QR еще не настроен</div>
        )}
      </div>

      {link?.trim() ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          onClick={onOpen}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-200 hover:text-amber-100"
        >
          <ExternalLink className="h-4 w-4" />
          Открыть ссылку
        </a>
      ) : null}
    </div>
  );
}
