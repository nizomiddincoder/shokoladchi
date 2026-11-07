import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import TopIcon from '../components/TopIcon';
import Chip from '../components/Chip';
import ProductCard from '../components/ProductCard';
import FilterSheet, { DEFAULT_FILTERS } from '../components/FilterSheet';
import { CATEGORIES, PRODUCTS } from '../data';

// Screen 2 — Most Popular: category chips + 2-column product grid + filter sheet.
export default function PopularScreen({ back, push, likes, toggleLike }) {
  const [cat, setCat] = useState('All');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState(false);

  const list = useMemo(() => {
    let out = PRODUCTS.filter((p) => cat === 'All' || p.category === cat);
    out = out.filter((p) => p.price >= filters.price[0] && p.price <= filters.price[1]);
    if (filters.rating > 0) out = out.filter((p) => Math.round(p.rating) >= filters.rating);
    const sorters = {
      Popular: (a, b) => b.reviews - a.reviews,
      'Most Recent': (a, b) => b.id - a.id,
      'Price High': (a, b) => b.price - a.price,
      'Price Low': (a, b) => a.price - b.price,
    };
    return [...out].sort(sorters[filters.sort]);
  }, [cat, filters]);

  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar
        title="Most Popular"
        sub={`${list.length} products`}
        onBack={back}
        right={
          <>
            <TopIcon label="Search" onClick={() => push('search')}>
              <Search size={19} />
            </TopIcon>
            <TopIcon label="Filter" onClick={() => setSheet(true)}>
              <SlidersHorizontal size={19} />
            </TopIcon>
          </>
        }
      />
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => (
          <Chip key={c} selected={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-12">
        <div className="grid grid-cols-2 gap-3.5">
          {list.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              liked={!!likes[p.id]}
              onLike={() => toggleLike(p.id)}
              onOpen={() => push('detail', { pid: p.id })}
            />
          ))}
        </div>
      </div>
      <FilterSheet open={sheet} onClose={() => setSheet(false)} value={filters} onApply={setFilters} />
    </div>
  );
}
