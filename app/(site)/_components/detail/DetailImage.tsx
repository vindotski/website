import Image from "next/image";
import type { Image as ContentImage } from "@/lib/types";

type DetailImageProps = {
  image: ContentImage;
  // Widest the frame gets, so the browser picks a fitting file size
  sizes: string;
};

// Fixed 16:10 frame, matching the project cards. not-prose, since MDX images
// render here too and typography mustn't style the frame
export default function DetailImage({ image, sizes }: DetailImageProps) {
  return (
    <div className="not-prose relative aspect-[16/10] overflow-hidden bg-muted">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
