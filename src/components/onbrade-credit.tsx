const PHONES = [
  { label: "+225 07 47 70 04 04", href: "tel:+2250747700404" },
  { label: "05 55 56 57 80", href: "tel:+2250555565780" },
];

export function OnBradeCredit({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <span>Propulsé par</span>
      <a
        href="https://www.on-brade.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-white/55 transition hover:text-white"
      >
        On-Brade.Com
      </a>
      <span className="text-white/15">·</span>
      {PHONES.map((phone, index) => (
        <span key={phone.href} className="inline-flex items-center gap-2">
          {index > 0 ? <span className="text-white/15">/</span> : null}
          <a href={phone.href} className="transition hover:text-white">
            {phone.label}
          </a>
        </span>
      ))}
    </span>
  );
}
