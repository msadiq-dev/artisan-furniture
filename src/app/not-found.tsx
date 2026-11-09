import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h1 className="font-serif text-4xl font-semibold text-[#26262B]">404 - Page Not Found</h1>
      <p className="text-sm text-[#6B665E]">The page or piece you are looking for does not exist.</p>
      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}
