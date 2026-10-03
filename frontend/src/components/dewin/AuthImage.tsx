import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";

/**
 * An image served by an authenticated backend route. <img src> can't send
 * the session header, so the bytes are fetched and shown as an object URL.
 */
export function AuthImage({
  queryKey,
  load,
  alt,
  className = "",
}: {
  queryKey: readonly unknown[];
  load: () => Promise<string>;
  alt: string;
  className?: string;
}) {
  const { data } = useQuery({ queryKey, queryFn: load, staleTime: Infinity, retry: false });
  if (!data) return <ImagePlaceholder className={className} />;
  return <img src={data} alt={alt} className={`object-cover ${className}`} />;
}

export function ImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center bg-brand-blue-soft text-brand-blue ${className}`}
    >
      <User className="h-1/2 w-1/2" />
    </span>
  );
}
