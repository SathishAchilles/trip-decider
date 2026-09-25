import type { Photo } from "@/lib/photos";

export function PhotoCredit({ photo, className = "" }: { photo: Photo; className?: string }) {
  return (
    <p className={`text-[0.65rem] text-white/60 ${className}`}>
      Photo:{" "}
      <a href={photo.profileUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
        {photo.photographer}
      </a>{" "}
      /{" "}
      <a href={photo.photoUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
        Unsplash
      </a>
    </p>
  );
}
