import { createContext, type ReactNode, useContext, useEffect } from "react";
import { useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "#/components/ui/resizable";
import { layoutStorage, useShell } from "./editor-context";

// Every place but Home is a list (master) and the thing picked from it (detail). The master is
// the list you're in: a folder, Settings, the team. Phones show one of them at a time — the detail
// when there is one; wide screens show both, the list in a resizable column (⌘B hides it) and an
// empty state until something is picked. Docs: The dashboard.

const InDetail = createContext(false);

/** A row of a master list; the current one (aria-current, set by Link) is highlighted. */
export const LIST_ROW =
	"flex min-h-12 items-center gap-3 border-b px-4 py-2 text-sm outline-none hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=page]:bg-muted";

/** Inside a detail on a wide screen, where its list is already beside it (no back arrow needed). */
export function useBesideList() {
	const inDetail = useContext(InDetail);
	const { desktop } = useShell();
	return inDetail && desktop;
}

export function MasterDetail({
	id,
	master,
	detail,
	empty,
}: {
	/** Remembers the column width per place. */
	id: string;
	master: ReactNode;
	detail?: ReactNode;
	/** What the detail side says until something is picked (wide screens). */
	empty: ReactNode;
}) {
	const { desktop, explorerOpen, setExplorerOpen } = useShell();
	const panel = usePanelRef();
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: `spotcraft-${id}`,
		storage: layoutStorage,
		onlySaveAfterUserInteractions: true,
	});

	useEffect(() => {
		const p = panel.current;
		if (!p) return;
		if (explorerOpen && p.isCollapsed()) p.expand();
		if (!explorerOpen && !p.isCollapsed()) p.collapse();
	}, [explorerOpen, panel]);

	if (!desktop) {
		return detail ? <InDetail.Provider value>{detail}</InDetail.Provider> : master;
	}

	return (
		<ResizablePanelGroup
			id={`spotcraft-${id}`}
			orientation="horizontal"
			defaultLayout={defaultLayout}
			onLayoutChanged={onLayoutChanged}
		>
			<ResizablePanel
				id="master"
				panelRef={panel}
				defaultSize={300}
				minSize={200}
				maxSize="45%"
				collapsible
				collapsedSize={0}
				onResize={(size) => {
					const collapsed = size.asPercentage === 0;
					if (collapsed === explorerOpen) setExplorerOpen(!collapsed);
				}}
			>
				<div className="h-full overflow-y-auto border-r">{master}</div>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel id="detail" minSize="40%">
				<div className="h-full overflow-y-auto">
					{detail ? (
						<InDetail.Provider value>{detail}</InDetail.Provider>
					) : (
						<div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
							{empty}
						</div>
					)}
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
