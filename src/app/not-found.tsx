import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-pad flex flex-col items-center py-24 text-center">
      <p className="font-serif text-7xl text-gold">404</p>
      <h1 className="mt-4 font-serif text-3xl text-charcoal">This page has eloped</h1>
      <p className="mt-3 max-w-md text-charcoal-muted">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-gold">Back to home</Link>
        <Link href="/invitation-videos" className="btn-outline">Browse videos</Link>
        <Link href="/contact" className="btn-ghost">Contact us</Link>
      </div>
    </div>
  );
}
