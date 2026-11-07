import { ArrowLeft, SearchX } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import PrimaryButton from '../components/PrimaryButton';
import BrandMark from '../components/BrandMark';

// Screen 4 — empty search result with centered illustration.
export default function NotFoundScreen({ back, push, params }) {
  const query = params?.query || '';
  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <div className="px-4 py-2">
        <button
          onClick={back}
          className="w-10 h-10 grid place-items-center rounded-full bg-white shadow-soft border border-black/5"
          aria-label="Back"
        >
          <ArrowLeft size={19} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center pb-24">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-white shadow-card grid place-items-center">
            <SearchX size={52} className="text-[#C7C7CC]" strokeWidth={1.4} />
          </div>
          <div className="absolute -right-2 -bottom-1 w-11 h-11 rounded-[14px] bg-ink shadow-card grid place-items-center rotate-6">
            <BrandMark className="w-7 h-7" />
          </div>
        </div>
        <h1 className="text-[20px] font-semibold mt-7">Not Found</h1>
        <p className="text-[13px] text-mut leading-relaxed mt-2">
          We couldn’t find anything for “{query}”. Try a different keyword or check the spelling.
        </p>
        <div className="w-full mt-7">
          <PrimaryButton onClick={() => push('search')}>Try another keyword</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
