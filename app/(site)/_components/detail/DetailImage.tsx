import Image from "next/image";
import type { Image as ContentImage } from "@/lib/types";
import styles from "./DetailImage.module.css";

type DetailImageProps = {
  image: ContentImage;
  // Widest the frame gets, so the browser picks a fitting file size
  sizes: string;
};

// Fixed 16:10 frame, matching the project cards
export default function DetailImage({ image, sizes }: DetailImageProps) {
  return (
    <div className={styles.frame}>
      <Image src={image.src} alt={image.alt} fill sizes={sizes} />
    </div>
  );
}
