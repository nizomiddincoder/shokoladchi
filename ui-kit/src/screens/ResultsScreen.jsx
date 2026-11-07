import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import TopIcon from '../components/TopIcon';
import ProductCard from '../components/ProductCard';
import FilterSheet, { DEFAULT_FILTERS } from '../components/FilterSheet';
import { searchProducts } from '../data';

// Screen 5 — search results grid with filter sheet.
export default function ResultsScreen({ back, push, params, likes, toggleLike }) {
  const query = params?.query || '';
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState(false);

  const list = useMemo(() => {
    let out = searchProducts(query);
    out = out.filter((p) => p.price >= filters.price[0] && p.price <= filters.price[1]);
    if (filters.rating > 0) out = out.filter((p) => Math.round(p.rating) >= filters.rating);
    const sorters = {
      Popular: (a, b) => b.reviews - a.reviews,
      'Most Recent': (a, b) => b.id - a.id,
      'Price High': (a, b) => b.price - a.price,
      'Price Low': (a, b) => a.price - b.price,
    };
    return [...out].sort(sorters[filters.sort]);
  }, [query, filters]);

  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar
        title={`Results for “${query}”`}
        sub={`${list.length} found`}
        onBack={back}
        right={
          <TopIcon label="Filter" onClick={() => setSheet(true)}>
            <SlidersHorizontal size={19} />
          </TopIcon>
        }
      />
      <div className="px-5 pb-3">
        <button
          onClick={() => push('search')}
          className="w-full flex items-center gap-2.5 bg-white rounded-[16px] h-11 px-4 shadow-soft text-left"
        >
          <Search size={17} className="text-mut shrink-0" />
          <span className="flex-1 text-[13px] font-medium truncate">{query}</span>
          <X size={15} className="text-mut" />
        </button>
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
