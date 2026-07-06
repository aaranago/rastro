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

  const [primaryPhoto, ...secondaryPhotos] = photos;
  const hiddenPhotoCount = Math.max(0, secondaryPhotos.length - 2);

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(140px,0.38fr)]">
      {primaryPhoto ? (
        <div
          className="bg-muted relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-lg"
          key={primaryPhoto.src}
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
            alt={primaryPhoto.alt}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 56vw, 100vw"
            src={primaryPhoto.src}
            unoptimized
          />
        </div>
      ) : null}
      {secondaryPhotos.length > 0 ? (
        <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-1">
          {secondaryPhotos.slice(0, 2).map((photo, index) => (
            <div
              className="bg-muted relative aspect-[4/3] min-w-0 overflow-hidden rounded-lg"
              key={photo.src}
            >
              <Image
                alt={photo.alt}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 16rem, 50vw"
                src={photo.src}
                unoptimized
              />
              {index === 1 && hiddenPhotoCount > 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                  +{hiddenPhotoCount}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
