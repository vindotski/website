import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { InspectorSection } from "#/components/layouts/inspector";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { useSite } from "#/hooks/use-site";
import { copyText } from "#/lib/copy";
import { CONTENT_KEY, documentImagesQuery } from "#/lib/files/queries";
import { deleteDocumentImage, uploadDocumentImage } from "#/server/images.functions";

// A document's images, in its inspector: upload (the file's name is the image's name; the same
// name replaces it), copy a reference for the body or a field, delete. Hidden when images are off.
// Docs: Images.

const kb = (bytes: number) =>
	bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function DocumentImages({ documentId }: { documentId: string }) {
	const site = useSite();
	const queryClient = useQueryClient();
	const { data } = useQuery(documentImagesQuery(documentId));
	const upload = useServerFn(uploadDocumentImage);
	const remove = useServerFn(deleteDocumentImage);
	const input = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	/** The image being deleted. */
	const [deleting, setDeleting] = useState<string | null>(null);
	if (!data?.enabled) return null;

	const refresh = () => queryClient.invalidateQueries({ queryKey: CONTENT_KEY });

	async function add(files: FileList | null) {
		if (!files?.length) return;
		setUploading(true);
		try {
			for (const file of files) {
				const form = new FormData();
				form.set("documentId", documentId);
				form.set("file", file);
				const result = await upload({ data: form });
				if (result.ok) toast.success(`Uploaded ${result.image.name}`);
				else toast.error(`${file.name}: ${result.error}`);
			}
		} catch {
			toast.error("Couldn't upload. Try again.");
		} finally {
			setUploading(false);
			if (input.current) input.current.value = "";
			await refresh();
		}
	}

	async function del(id: string, name: string) {
		setDeleting(id);
		const result = await remove({ data: { id } }).catch(() => null);
		if (result?.ok) toast.success(`Deleted ${name}`);
		else toast.error(result?.error ?? "Couldn't delete. Try again.");
		await refresh();
		setDeleting(null);
	}

	const busy = uploading || deleting !== null;

	return (
		<InspectorSection title="Images">
			{data.images.length ? (
				<ul className="grid gap-2">
					{data.images.map((image) => (
						<li key={image.id} className="flex items-center gap-2">
							<img
								src={`/${site}/media/${image.path}?v=${image.file.sha256.slice(0, 12)}`}
								alt=""
								className="size-10 shrink-0 rounded border bg-muted object-cover"
							/>
							<span className="grid min-w-0 flex-1">
								<span className="truncate font-mono text-xs">{image.name}</span>
								<span className="text-xs text-muted-foreground">
									{image.file.width}×{image.file.height} · {kb(image.file.bytes)}
								</span>
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-7"
								aria-label={`Copy Markdown for ${image.name}`}
								title="Copy Markdown for the body"
								onClick={() => copyText(`![](${image.name})`, "the Markdown")}
							>
								<Copy className="size-3.5" />
							</Button>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7 text-destructive"
										aria-label={`Delete ${image.name}`}
										disabled={busy}
									>
										<Trash2 className="size-3.5" />
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete {image.name}?</AlertDialogTitle>
										<AlertDialogDescription>
											This can't be undone. Anything that uses it will show a missing image.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											variant="destructive"
											onClick={() => void del(image.id, image.name)}
										>
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</li>
					))}
				</ul>
			) : (
				<p className="text-muted-foreground">No images yet.</p>
			)}
			<p className="text-xs text-muted-foreground">
				In the body: <code className="font-mono">![alt](cover.png)</code>. In an image field:{" "}
				<code className="font-mono">{"{ src: cover.png, alt: … }"}</code>.
			</p>
			<input
				ref={input}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
				multiple
				hidden
				onChange={(e) => void add(e.target.files)}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={busy}
				onClick={() => input.current?.click()}
			>
				<ImagePlus className="size-4" />
				{uploading ? "Uploading…" : "Upload images"}
			</Button>
		</InspectorSection>
	);
}
