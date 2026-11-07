// ── Umumiy komponent kutubxonasi (uchala modul uchun) ──────────────────────
import { useRef, useState } from 'react';
import { Check, Minus, Plus, Star } from 'lucide-react';

export const cn = (...a) => a.filter(Boolean).join(' ');

// Brend belgisi (favicon) — mahsulot placholderi sifatida ham ishlatiladi.
export const BrandMark = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Shokoladchi">
    <rect width="64" height="64" rx="16" fill="#3B2216" />
    <g transform="rotate(-8 32 34)">
      <rect x="19" y="13" width="26" height="38" rx="6" fill="#8B5E3C" />
      <rect x="22.5" y="16.5" width="9" height="12" rx="2.5" fill="#A9744F" />
      <rect x="32.5" y="16.5" width="9" height="12" rx="2.5" fill="#A9744F" />
      <rect x="22.5" y="30.5" width="9" height="12" rx="2.5" fill="#A9744F" />
      <rect x="32.5" y="30.5" width="9" height="12" rx="2.5" fill="#A9744F" />
      <rect x="19" y="13" width="26" height="6" rx="6" fill="#fff" opacity=".14" />
    </g>
  </svg>
);

// Neutral mahsulot placholderi — burchaklari yumaloq.
export const ProductImage = ({ p, className = 'aspect-square rounded-card', mark = 'w-1/3 h-1/3' }) => (
  <div className={cn('relative overflow-hidden shrink-0', className)} style={{ background: `linear-gradient(140deg, ${p.c1}, ${p.c2})` }}>
    <div className="absolute -right-3 -bottom-4 opacity-15"><BrandMark className="w-20 h-20" /></div>
    <div className="absolute inset-0 grid place-items-center"><BrandMark className={mark} /></div>
  </div>
);

// ── Button ──
const BTNV = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-primary-100 text-primary-700 hover:bg-primary-100',
  outline: 'bg-surface border border-line text-body hover:bg-bg',
  ghost: 'text-primary-700 hover:bg-primary-100',
  danger: 'bg-softDanger text-danger hover:bg-softDanger',
};
const BTNS = { sm: 'h-9 px-3.5 text-[13px]', md: 'h-11 px-5 text-sm', lg: 'h-[52px] px-6 text-[15px]' };
export const Button = ({ children, onClick, variant = 'primary', size = 'md', className, disabled, icon: Icon }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-btn font-semibold transition active:scale-[.98] disabled:opacity-40',
      BTNV[variant], BTNS[size], className
    )}
  >
    {Icon && <Icon size={size === 'lg' ? 19 : 16} />} {children}
  </button>
);

export const Card = ({ children, className, pad = true }) => (
  <div className={cn('bg-surface rounded-card shadow-soft', pad && 'p-4', className)}>{children}</div>
);

// ── Chip: aktiv = shokolad ──
export const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    aria-pressed={!!active}
    className={cn(
      'shrink-0 inline-flex items-center gap-1 h-9 px-4 rounded-full text-[13px] font-medium transition active:scale-95',
      active ? 'bg-primary-600 text-white' : 'bg-surface border border-line text-body'
    )}
  >
    {children}
  </button>
);

// ── Input (label bilan) ──
export const Input = ({ label, error, icon: Icon, right, className, ...rest }) => (
  <label className={cn('block', className)}>
    {label && <span className="block text-[12px] font-medium text-muted mb-1.5">{label}</span>}
    <span className="relative flex items-center">
      {Icon && <Icon size={16} className="absolute left-3.5 text-muted pointer-events-none" />}
      <input
        {...rest}
        className={cn(
          'w-full h-11 rounded-btn border bg-surface px-4 text-sm placeholder:text-muted',
          'focus:border-primary-400 outline-none transition',
          Icon && 'pl-10', error ? 'border-danger' : 'border-line', right && 'pr-20'
        )}
      />
      {right && <span className="absolute right-2 flex items-center">{right}</span>}
    </span>
    {error && <span className="block text-[12px] text-danger mt-1">{error}</span>}
  </label>
);

// ── Checkbox ──
export const Checkbox = ({ checked, onChange, label, right }) => (
  <button
    role="checkbox"
    aria-checked={!!checked}
    onClick={() => onChange(!checked)}
    className="w-full flex items-center gap-3 py-2 text-left active:opacity-80"
  >
    <span className={cn('w-5 h-5 rounded-[6px] border grid place-items-center shrink-0 transition',
      checked ? 'bg-primary-600 border-primary-600' : 'bg-surface border-line')}>
      {checked && <Check size={13} className="text-white" strokeWidth={3} />}
    </span>
    <span className="flex-1 text-[13px] font-medium">{label}</span>
    {right && <span className="text-[12px] text-muted tnum">{right}</span>}
  </button>
);

// ── RadioCard ──
export const RadioCard = ({ checked, onChange, title, sub, right, name }) => (
  <button
    type="button"
    role="radio"
    name={name}
    aria-checked={!!checked}
    onClick={onChange}
    className={cn(
      'w-full flex items-center gap-3 bg-surface rounded-card px-4 py-3.5 border shadow-soft text-left transition active:scale-[.99]',
      checked ? 'border-primary-400' : 'border-line'
    )}
  >
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-semibold">{title}</span>
      {sub && <span className="block text-[12px] text-muted mt-0.5">{sub}</span>}
    </span>
    {right}
    <span className={cn('w-5 h-5 rounded-full border-2 grid place-items-center shrink-0', checked ? 'border-primary-600' : 'border-line')}>
      {checked && <span className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
    </span>
  </button>
);

// ── Stepper (miqdor) ──
export const Stepper = ({ value, onChange, small, ariaLabel = 'Miqdor', min = 1 }) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={cn('inline-flex items-center bg-surface border border-line rounded-full', small ? 'gap-1 px-1 py-0.5' : 'gap-2 px-1.5 py-1')}
  >
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      aria-label="Kamaytirish"
      className={cn('grid place-items-center rounded-full active:scale-90 transition', small ? 'w-7 h-7' : 'w-8 h-8', value <= min ? 'text-muted' : 'text-body')}
    >
      <Minus size={small ? 13 : 15} />
    </button>
    <span aria-live="polite" className={cn('tnum font-semibold text-center', small ? 'text-[13px] w-4' : 'text-sm w-5')}>{value}</span>
    <button
      onClick={() => onChange(value + 1)}
      aria-label="Ko'paytirish"
      className={cn('grid place-items-center rounded-full bg-primary-600 text-white active:scale-90 transition', small ? 'w-7 h-7' : 'w-8 h-8')}
    >
      <Plus size={small ? 13 : 15} />
    </button>
  </div>
);

// ── Badge (faqat semantik ranglar) ──
const TONES = {
  success: 'bg-softSuccess text-success', warning: 'bg-softWarning text-warning',
  danger: 'bg-softDanger text-danger', brand: 'bg-primary-100 text-primary-700',
  neutral: 'bg-bg text-muted',
};
export const Badge = ({ tone = 'neutral', children }) => (
  <span className={cn('inline-flex items-center text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap', TONES[tone])}>{children}</span>
);

// ── PriceText — barcha pullar tabular-nums ──
const PSZ = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-[18px]', xl: 'text-[26px]' };
export const PriceText = ({ value, size = 'md', old, className }) => (
  <span className={cn('tnum font-bold text-primary-600', PSZ[size], className)}>
    {old != null && <span className="font-medium text-muted line-through mr-1.5">{old.toLocaleString('ru-RU')} </span>}
    {Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm
  </span>
);

// ── Rating — yulduzlar shokolad (primary-400) ──
export const Rating = ({ value, count, size = 12 }) => (
  <span className="inline-flex items-center gap-1">
    <span className="flex gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={1.5} className={i <= Math.round(value) ? 'text-primary-400' : 'text-starOff'}
          fill={i <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
    </span>
    <span className="tnum text-[11px] text-muted">{value}{count != null && ` (${count})`}</span>
  </span>
);

// ── StatCard (KPI) ──
const STAT_TONES = {
  brand: 'bg-primary-100 text-primary-700', success: 'bg-softSuccess text-success',
  warning: 'bg-softWarning text-warning', danger: 'bg-softDanger text-danger',
};
export const StatCard = ({ label, value, sub, icon: Icon, tone = 'brand' }) => (
  <Card className="flex items-center gap-3.5">
    {Icon && <span className={cn('w-11 h-11 rounded-card grid place-items-center shrink-0', STAT_TONES[tone])}><Icon size={20} /></span>}
    <span className="min-w-0">
      <span className="block tnum text-[22px] font-bold leading-tight">{value}</span>
      <span className="block text-[12px] text-muted truncate">{label}</span>
      {sub && <span className="block text-[11px] font-semibold text-primary-600 mt-0.5">{sub}</span>}
    </span>
  </Card>
);

// ── Table ──
export const Table = ({ head, children, className }) => (
  <div className={cn('w-full overflow-x-auto', className)}>
    <table className="w-full text-left border-collapse min-w-[640px]">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className="text-[11px] uppercase tracking-wide text-muted font-semibold px-3 py-2.5 whitespace-nowrap bg-bg rounded-card">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);
export const Td = ({ children, className }) => (
  <td className={cn('px-3 py-2.5 text-[13px] border-t border-line whitespace-nowrap tnum', className)}>{children}</td>
);

// ── Modal ──
export const Modal = ({ open, onClose, title, children, global, wide }) => {
  if (!open) return null;
  return (
    <div className={cn('inset-0 z-50 grid place-items-center p-5 bg-[rgba(42,29,22,0.45)]', global ? 'fixed' : 'absolute')}>
      <div className={cn('bg-surface rounded-card shadow-pop w-full p-5 animate-pop', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Yopish" className="w-8 h-8 grid place-items-center rounded-full text-muted hover:bg-bg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Skeleton / Empty / Error ──
export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div className={cn('bg-primary-100 rounded-full animate-pulse', className)} />
);
export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="py-14 flex flex-col items-center text-center px-8">
    {Icon && <span className="w-16 h-16 rounded-full bg-primary-100 grid place-items-center text-primary-400"><Icon size={28} /></span>}
    <p className="text-[15px] font-semibold mt-4">{title}</p>
    {text && <p className="text-[12px] text-muted mt-1 leading-relaxed">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
export const ErrorState = ({ text = 'Internet aloqasi uzildi', onRetry }) => (
  <div className="py-10 flex flex-col items-center text-center px-8">
    <span className="w-14 h-14 rounded-full bg-softDanger grid place-items-center text-danger text-2xl font-bold">!</span>
    <p className="text-[14px] font-semibold mt-3 text-danger">{text}</p>
    <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Qayta urinish</Button>
  </div>
);

// ── Toast ──
export const useToast = () => {
  const [msg, setMsg] = useState(null);
  const ref = useRef(null);
  const show = (m) => {
    clearTimeout(ref.current);
    setMsg(m);
    ref.current = setTimeout(() => setMsg(null), 2200);
  };
  return { msg, show };
};
export const Toast = ({ msg }) =>
  msg ? (
    <div className="absolute left-1/2 bottom-24 z-[60] animate-toast pointer-events-none">
      <div className="bg-primary-700 text-white text-[13px] font-medium px-5 py-3 rounded-full shadow-pop whitespace-nowrap">{msg}</div>
    </div>
  ) : null;

export const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-[15px] font-semibold">{children}</h2>
    {right}
  </div>
);

// ── Telefon / planshet ramkalari ──
export const StatusBar = () => (
  <div className="relative z-20 flex items-center justify-between px-7 pt-3.5 pb-1 text-body">
    <span className="text-[14px] font-semibold tnum">9:41</span>
    <span className="flex items-center gap-1.5 text-body">
      <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><rect y="7" width="3" height="5" rx="1" /><rect x="4.5" y="5" width="3" height="7" rx="1" /><rect x="9" y="2.5" width="3" height="9.5" rx="1" /><rect x="13.5" width="3" height="12" rx="1" /></svg>
      <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" /><path d="M23.5 4v4c1-.3 1.5-1 1.5-2s-.5-1.7-1.5-2z" fill="currentColor" opacity=".4" /></svg>
    </span>
  </div>
);
export const PhoneFrame = ({ children }) => (
  <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] sm:max-h-[94vh] sm:rounded-[48px] sm:border-[11px] sm:border-black overflow-hidden bg-bg sm:shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
    <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-[110px] h-[28px] bg-black rounded-full z-40 pointer-events-none" />
    <div className="h-full">{children}</div>
    <div className="hidden sm:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[120px] h-[5px] bg-black/80 rounded-full z-40 pointer-events-none" />
  </div>
);
export const TabletFrame = ({ children }) => (
  <div className="relative w-[1024px] h-[768px] max-w-full rounded-[36px] border-[12px] border-black overflow-hidden bg-bg shadow-[0_40px_120px_rgba(0,0,0,0.5)] mx-auto">
    {children}
    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[140px] h-[5px] bg-black/80 rounded-full pointer-events-none" />
  </div>
);
