import { useState } from 'react';
import { Search, Clock, X, Delete } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import { RECENTS, searchProducts } from '../data';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// Screen 3 — Search: recent searches + on-screen keyboard mockup.
export default function SearchScreen({ back, push }) {
  const [q, setQ] = useState('');
  const [recents, setRecents] = useState(RECENTS);

  const go = (query) => {
    const term = query.trim();
    if (!term) return;
    setRecents((r) => [term, ...r.filter((x) => x !== term)].slice(0, 6));
    const hit = searchProducts(term).length > 0;
    push(hit ? 'results' : 'notfound', { query: term });
  };

  const type = (ch) => setQ((v) => v + ch.toLowerCase());
  const erase = () => setQ((v) => v.slice(0, -1));

  const Key = ({ children, onPress, wide = false, dark = false }) => (
    <button
      onClick={onPress}
      className={`h-11 rounded-[8px] text-[16px] font-medium shadow-sm active:bg-[#B9BCC3] transition-colors ${
        wide ? 'flex-[1.6]' : 'flex-1'
      } ${dark ? 'bg-ink text-white' : 'bg-white text-ink'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="Search" onBack={back} />
      <div className="px-5 pt-1">
        <div className="flex items-center gap-2.5 bg-white rounded-[16px] h-12 px-4 shadow-soft">
          <Search size={18} className="text-mut shrink-0" />
          <span className={`flex-1 text-[14px] truncate ${q ? 'font-medium' : 'text-mut'}`}>
            {q || 'Search chocolate, gifts…'}
          </span>
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear query">
              <X size={16} className="text-mut" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] font-semibold">Recent Searches</p>
          {recents.length > 0 && (
            <button onClick={() => setRecents([])} className="text-[12px] font-semibold text-mut">
              Clear All
            </button>
          )}
        </div>
        {recents.length === 0 ? (
          <p className="text-[13px] text-mut">No recent searches yet.</p>
        ) : (
          <div className="space-y-1">
            {recents.map((r) => (
              <div key={r} className="flex items-center gap-3 py-2.5 border-b border-[#E9E9EC] last:border-0">
                <Clock size={15} className="text-mut shrink-0" />
                <button onClick={() => go(r)} className="flex-1 text-left text-[13px] font-medium truncate">
                  {r}
                </button>
                <button
                  onClick={() => setRecents((list) => list.filter((x) => x !== r))}
                  aria-label={`Remove ${r}`}
                >
                  <X size={14} className="text-mut" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard mockup */}
      <div className="bg-[#D7D9DE] px-1.5 pt-2 pb-8 space-y-2 select-none">
        <div className="flex gap-1.5">
          {ROWS[0].map((k) => (
            <Key key={k} onPress={() => type(k)}>
              {k}
            </Key>
          ))}
        </div>
        <div className="flex gap-1.5 px-5">
          {ROWS[1].map((k) => (
            <Key key={k} onPress={() => type(k)}>
              {k}
            </Key>
          ))}
        </div>
        <div className="flex gap-1.5 items-stretch">
          <span className="flex-1" />
          {ROWS[2].map((k) => (
            <Key key={k} onPress={() => type(k)}>
              {k}
            </Key>
          ))}
          <button
            onClick={erase}
            className="flex-[1.6] h-11 rounded-[8px] bg-[#AEB3BC] shadow-sm grid place-items-center active:bg-[#B9BCC3]"
            aria-label="Backspace"
          >
            <Delete size={18} className="text-ink" />
          </button>
        </div>
        <div className="flex gap-1.5">
          <button className="flex-1 h-11 rounded-[8px] bg-[#AEB3BC] shadow-sm text-[14px] font-medium">123</button>
          <button onClick={() => type(' ')} className="flex-[4] h-11 rounded-[8px] bg-white shadow-sm text-[14px] font-medium">
            space
          </button>
          <button
            onClick={() => go(q)}
            className="flex-[1.8] h-11 rounded-[8px] bg-ink shadow-sm text-white text-[14px] font-semibold grid place-items-center active:opacity-80"
          >
            <Search size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
