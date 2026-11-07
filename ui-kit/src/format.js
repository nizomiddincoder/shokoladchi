// Pul va sana formatlash — umumiy modul.
export const som = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
export const somN = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const dmy = (d) => {
  const x = typeof d === 'string' ? new Date(d) : d;
  const p = (v) => String(v).padStart(2, '0');
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}`;
};
