import { useState } from 'react';
import { Heart, MessageCircle, Star } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import Chip from '../components/Chip';
import Stars from '../components/Stars';
import { REVIEWS } from '../data';

const AVATAR_GRADIENTS = {
  1: ['#F5C99B', '#E08E45'],
  2: ['#B8C6E3', '#7189B8'],
  3: ['#E9B7C4', '#C46B85'],
  4: ['#BFDCC2', '#6FA07A'],
  5: ['#E3D3B8', '#B89A6B'],
  6: ['#C9C0E3', '#8A7BB8'],
};

// Screen 8 — Reviews: rating header, star-level filter chips, review cards.
export default function ReviewsScreen({ back, params }) {
  const [level, setLevel] = useState(0);
  const [liked, setLiked] = useState({});

  const list = REVIEWS.filter((r) => level === 0 || r.stars === level);

  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="4.8" sub="(4,974 reviews)" onBack={back} />
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
        <Chip selected={level === 0} onClick={() => setLevel(0)}>
          All
        </Chip>
        {[5, 4, 3, 2, 1].map((n) => (
          <Chip key={n} selected={level === n} onClick={() => setLevel(n)}>
            <Star size={11} className="text-gold" fill="currentColor" strokeWidth={0} />
            {n}
          </Chip>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-12 space-y-3.5">
        {list.map((r) => {
          const [g1, g2] = AVATAR_GRADIENTS[r.id] || ['#D8D8DC', '#A8A8AE'];
          const isLiked = !!liked[r.id];
          return (
            <div key={r.id} className="bg-white rounded-[16px] p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full grid place-items-center text-[14px] font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                >
                  {r.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">{r.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Stars value={r.stars} size={11} />
                    <span className="text-[11px] text-mut">{r.date}</span>
                  </div>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed mt-2.5 text-ink/80">{r.text}</p>
              <div className="flex items-center gap-5 mt-3 text-mut">
                <button
                  onClick={() => setLiked({ ...liked, [r.id]: !isLiked })}
                  className="flex items-center gap-1.5 active:opacity-70"
                >
                  <Heart size={15} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
                  <span className="text-[12px] font-medium">{r.likes + (isLiked ? 1 : 0)}</span>
                </button>
                <button className="flex items-center gap-1.5 active:opacity-70">
                  <MessageCircle size={15} />
                  <span className="text-[12px] font-medium">Reply</span>
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="text-center text-[13px] text-mut pt-10">No reviews at this level yet.</p>
        )}
      </div>
    </div>
  );
}
