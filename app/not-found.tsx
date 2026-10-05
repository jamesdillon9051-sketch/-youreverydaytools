import Link from "next/link";
export default function NotFound() {
  return (
    <div className="panel mx-auto my-16 max-w-lg p-10 text-center">
      <p className="mb-3 text-xs font-semibold text-violet-500">
        404 · PAGE NOT FOUND
      </p>
      <h1 className="text-2xl font-bold">Let’s find the right tool.</h1>
      <p className="muted my-5">
        This page doesn’t exist. Your toolkit is one click away.
      </p>
      <Link href="/" className="btn">
        Browse all tools
      </Link>
    </div>
  );
}
