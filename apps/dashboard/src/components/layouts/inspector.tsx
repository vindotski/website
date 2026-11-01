import { ChevronRight } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "#/components/ui/resizable";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { layoutStorage, useShell } from "./editor-context";

/** A collapsible group in the inspector. */
export function InspectorSection({
	title,
	children,
	defaultOpen = true,
}: {
	title: string;
	children: ReactNode;
	defaultOpen?: boolean;
}) {
	return (
		<details open={defaultOpen} className="group border-b last:border-b-0">
			<summary className="flex cursor-pointer list-none items-center gap-1 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
				<ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
				{title}
			</summary>
			<div className="grid gap-4 px-4 pt-1 pb-4 text-sm">{children}</div>
		</details>
	);
}

/**
 * An open file: header, the document, and the inspector — a resizable panel on wide screens,
 * a sheet (right, or bottom on phones) otherwise.
 */
export function EditorFrame({
	header,
	inspector,
	children,
	title = "Details",
}: {
	header: ReactNode;
	inspector: ReactNode;
	children: ReactNode;
	title?: string;
}) {
	const { wide, desktop, inspectorOpen, setInspectorOpen, detailsOpen, setDetailsOpen } =
		useShell();
	const panel = usePanelRef();
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: "spotcraft-editor",
		storage: layoutStorage,
		onlySaveAfterUserInteractions: true,
	});

	useEffect(() => {
		const p = panel.current;
		if (!p) return;
		if (inspectorOpen && p.isCollapsed()) p.expand();
		if (!inspectorOpen && !p.isCollapsed()) p.collapse();
	}, [inspectorOpen, panel]);

	const document = <div className="h-full overflow-y-auto">{children}</div>;

	return (
		<div className="flex h-full min-h-0 flex-col">
			{header}
			<div className="min-h-0 flex-1">
				{wide ? (
					<ResizablePanelGroup
						id="spotcraft-editor"
						orientation="horizontal"
						defaultLayout={defaultLayout}
						onLayoutChanged={onLayoutChanged}
					>
						<ResizablePanel id="document" minSize="45%">
							{document}
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel
							id="inspector"
							panelRef={panel}
							defaultSize={320}
							minSize={240}
							maxSize={520}
							collapsible
							collapsedSize={0}
							onResize={(size) => {
								const collapsed = size.asPercentage === 0;
								if (collapsed === inspectorOpen) setInspectorOpen(!collapsed);
							}}
						>
							<aside aria-label={title} className="h-full overflow-y-auto bg-muted/20">
								{inspector}
							</aside>
						</ResizablePanel>
					</ResizablePanelGroup>
				) : (
					document
				)}
			</div>
			{!wide && (
				<Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
					<SheetContent
						side={desktop ? "right" : "bottom"}
						className={desktop ? "w-96 gap-0 p-0 sm:max-w-96" : "max-h-[85svh] gap-0 p-0"}
					>
						<SheetHeader className="border-b">
							<SheetTitle className="font-mono text-sm">{title}</SheetTitle>
							<SheetDescription className="sr-only">Settings for the open file</SheetDescription>
						</SheetHeader>
						<div className="min-h-0 flex-1 overflow-y-auto">{inspector}</div>
					</SheetContent>
				</Sheet>
			)}
		</div>
	);
}
