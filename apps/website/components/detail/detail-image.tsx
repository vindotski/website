import Image from "next/image";
import type { Image as ContentImage } from "@/types/common";

type DetailImageProps = {
  image: ContentImage;
  // Widest the frame gets, so the browser picks a fitting file size
  sizes: string;
  // For the page's main image, usually the largest thing on screen: loads
  // right away instead of when scrolled near
  eager?: boolean;
};

// Fixed 16:10 frame, matching the project cards. not-prose, since MDX images
// render here too and typography mustn't style the frame
export default function DetailImage({
  image,
  sizes,
  eager = false,
}: DetailImageProps) {
  return (
    <div className="not-prose relative aspect-[16/10] overflow-hidden bg-muted">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        className="object-cover"
      />
    </div>
  );
}
