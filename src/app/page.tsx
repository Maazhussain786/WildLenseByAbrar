import Explorer from '@/components/Explorer';
import { DEFAULT_TOUR } from '@/data/tours';

export default function Home() {
  return <Explorer tour={DEFAULT_TOUR} />;
}
