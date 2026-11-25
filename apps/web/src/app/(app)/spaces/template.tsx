/** Moving between items of the same kind (one plant to another): a soft fade, so it never stacks with the page entrance. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fade-in flex flex-1 flex-col">{children}</div>;
}
