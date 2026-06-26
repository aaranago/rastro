import Image from "next/image";

export interface PublicPhotoGridPhoto {
  alt: string;
  src: string;
}

export interface PublicPhotoGridProps {
  photos: PublicPhotoGridPhoto[];
}

export function PublicPhotoGrid({ photos }: PublicPhotoGridProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {photos.map((photo, index) => (
        <div
          className={
            index === 0
              ? "bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-lg sm:col-span-2"
              : "bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-lg"
          }
          key={photo.src}
        >
          <div
            aria-hidden="true"
            className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-sm"
          >
            <span className="bg-background/80 rounded-md px-3 py-2 font-medium">
              Imagen no disponible
            </span>
          </div>
          <Image
            alt={photo.alt}
            className="object-cover"
            fill
            sizes={index === 0 ? "(min-width: 640px) 60vw, 100vw" : "50vw"}
            src={photo.src}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
