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
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(140px,0.38fr)]">
      {primaryPhoto ? (
        <a
          aria-label={`Abrir foto principal: ${primaryPhoto.alt}`}
          className="bg-muted relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-lg"
          href={primaryPhoto.src}
          key={primaryPhoto.src}
          target="_blank"
          rel="noreferrer"
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
        </a>
      ) : null}
      {secondaryPhotos.length > 0 ? (
        <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-1">
          {secondaryPhotos.map((photo) => (
            <a
              aria-label={`Abrir foto: ${photo.alt}`}
              className="bg-muted relative aspect-[4/3] min-w-0 overflow-hidden rounded-lg"
              href={photo.src}
              key={photo.src}
              target="_blank"
              rel="noreferrer"
            >
              <Image
                alt={photo.alt}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 16rem, 50vw"
                src={photo.src}
                unoptimized
              />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
