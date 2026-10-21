// A grey block standing in for content that is still loading. Its shape follows what replaces it.
export function Bone({ className }: { className: string }) {
  const shape = className.includes("rounded-") ? "" : "rounded-lg";
  return <div className={`${shape} bg-black/10 motion-safe:animate-pulse dark:bg-white/15 ${className}`} />;
}

// Tells screen readers what the skeleton next to it stands for; the blocks themselves are hidden.
export function LoadingLabel({ children }: { children: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
