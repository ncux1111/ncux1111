export function ScaleAnimation() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="zan-scale-glow absolute inset-[14%] rounded-full bg-amber-300/12 blur-3xl" />

      <svg
        viewBox="0 0 320 360"
        aria-hidden="true"
        className="zan-scale-illustration relative"
        fill="none"
      >
        <defs>
          <linearGradient id="zanScaleGold" x1="52" y1="18" x2="268" y2="326" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F9D976" />
            <stop offset="0.45" stopColor="#D4AF37" />
            <stop offset="1" stopColor="#A66A11" />
          </linearGradient>
          <linearGradient id="zanScaleStand" x1="160" y1="64" x2="160" y2="332" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE7A3" />
            <stop offset="1" stopColor="#8A5A12" />
          </linearGradient>
        </defs>

        <g opacity="0.35">
          <circle cx="160" cy="160" r="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          <circle cx="160" cy="160" r="92" stroke="rgba(212,175,55,0.18)" strokeWidth="1.5" />
        </g>

        <g>
          <path
            d="M146 66c0-7.732 6.268-14 14-14s14 6.268 14 14v18h18c3.314 0 6 2.686 6 6s-2.686 6-6 6h-64c-3.314 0-6-2.686-6-6s2.686-6 6-6h18V66Z"
            fill="url(#zanScaleStand)"
          />
          <rect x="150" y="90" width="20" height="168" rx="10" fill="url(#zanScaleStand)" />
          <path d="M112 292h96l18 28H94l18-28Z" fill="url(#zanScaleGold)" />
          <rect x="84" y="318" width="152" height="20" rx="10" fill="#D4AF37" />
          <rect x="98" y="334" width="124" height="10" rx="5" fill="#A66A11" opacity="0.8" />
        </g>

        <g className="zan-scale-beam-group">
          <rect x="78" y="112" width="164" height="12" rx="6" fill="url(#zanScaleGold)" />
          <circle cx="160" cy="118" r="18" fill="url(#zanScaleGold)" />
          <circle cx="160" cy="118" r="7" fill="#FFF3C4" />

          <g>
            <line x1="104" y1="124" x2="88" y2="176" stroke="url(#zanScaleGold)" strokeWidth="4" strokeLinecap="round" />
            <line x1="104" y1="124" x2="120" y2="176" stroke="url(#zanScaleGold)" strokeWidth="4" strokeLinecap="round" />
            <line x1="88" y1="176" x2="120" y2="176" stroke="url(#zanScaleGold)" strokeWidth="4" strokeLinecap="round" />
            <path d="M74 176h60l-8 22c-2 6-8 10-14 10H96c-6 0-12-4-14-10l-8-22Z" fill="url(#zanScaleGold)" />
          </g>

          <g>
            <line x1="216" y1="124" x2="200" y2="176" stroke="url(#zanScaleGold)" strokeWidth="4" strokeLinecap="round" />
            <line x1="216" y1="124" x2="232" y2="176" stroke="url(#zanScaleGold)" strokeWidth="4" strokeLinecap="round" />
            <line x1="200" y1="176" x2="232" y2="176" stroke="url(#zanScaleGold)" strokeWidth="4" strokeLinecap="round" />
            <path d="M186 176h60l-8 22c-2 6-8 10-14 10h-16c-6 0-12-4-14-10l-8-22Z" fill="url(#zanScaleGold)" />
          </g>
        </g>
      </svg>
    </div>
  );
}
