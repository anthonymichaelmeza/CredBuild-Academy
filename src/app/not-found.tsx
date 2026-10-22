import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-wrap">
      <h1>That page isn’t available.</h1>
      <p>
        The link may be invalid, or this session may belong to another
        workspace.
      </p>
      <Link className="button primary" href="/">
        Return to dashboard
      </Link>
    </div>
  );
}
