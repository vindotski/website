import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";

// Shell state shared by the top bar, the list and inspector panels, and the open editor.
// Per-browser conveniences (panel sizes, explorer open) live in localStorage; every access is
// guarded.

/** A file is edited as its source; a document can also show its body rendered. Settings is a form. */
export type EditorView = "source" | "preview" | "form";

/** What the open file tells the shell (its title and actions, for the shortcuts). */
export type EditorState = {
	path: string;
	dirty: boolean;
	saving: boolean;
	conflict: boolean;
	view: EditorView;
};

export type EditorActions = {
	save: () => void;
	publish?: () => void;
	/** Switch Source ⇄ Preview, when the file has a preview. */
	toggleView?: () => void;
	showConflict?: () => void;
};

type Shell = {
	/** ≥1280px: the inspector is a panel; below, a sheet. */
	wide: boolean;
	/** ≥768px: rail and explorer; below, the phone layout. */
	desktop: boolean;
	explorerOpen: boolean;
	setExplorerOpen: (open: boolean) => void;
	inspectorOpen: boolean;
	setInspectorOpen: (open: boolean) => void;
	detailsOpen: boolean;
	setDetailsOpen: (open: boolean) => void;
	toggleInspector: () => void;
	editor: EditorState | null;
	actions: RefObject<EditorActions | null>;
	setEditor: (state: EditorState | null) => void;
};

const ShellContext = createContext<Shell | null>(null);

const EXPLORER_KEY = "spotcraft:explorer";

function read(key: string) {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string) {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// Private mode or blocked storage: the convenience is just not remembered.
	}
}

/** Panel layouts for react-resizable-panels, with the same guards. */
export const layoutStorage = {
	getItem: (key: string) => (typeof window === "undefined" ? null : read(key)),
	setItem: (key: string, value: string) => {
		if (typeof window !== "undefined") write(key, value);
	},
};

function useMedia(query: string) {
	return useSyncExternalStore(
		(onChange) => {
			const media = window.matchMedia(query);
			media.addEventListener("change", onChange);
			return () => media.removeEventListener("change", onChange);
		},
		() => window.matchMedia(query).matches,
		// The server renders the desktop layout; phones switch right after hydration.
		() => true,
	);
}

export function ShellProvider({ children }: { children: ReactNode }) {
	const wide = useMedia("(min-width: 1280px)");
	const desktop = useMedia("(min-width: 768px)");
	const [explorerOpen, setExplorerOpenState] = useState(true);
	const [inspectorOpen, setInspectorOpen] = useState(true);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [editor, setEditorState] = useState<EditorState | null>(null);
	const actions = useRef<EditorActions | null>(null);

	// Restore per-browser state after mount (never during SSR).
	useEffect(() => {
		if (read(EXPLORER_KEY) === "closed") setExplorerOpenState(false);
	}, []);

	const setExplorerOpen = useCallback((open: boolean) => {
		setExplorerOpenState(open);
		write(EXPLORER_KEY, open ? "open" : "closed");
	}, []);

	const setEditor = useCallback((state: EditorState | null) => {
		setEditorState((current) =>
			JSON.stringify(current) === JSON.stringify(state) ? current : state,
		);
	}, []);

	const value = useMemo<Shell>(
		() => ({
			wide,
			desktop,
			explorerOpen,
			setExplorerOpen,
			inspectorOpen,
			setInspectorOpen,
			detailsOpen,
			setDetailsOpen,
			toggleInspector: () => (wide ? setInspectorOpen((o) => !o) : setDetailsOpen((o) => !o)),
			editor,
			actions,
			setEditor,
		}),
		[wide, desktop, explorerOpen, setExplorerOpen, inspectorOpen, detailsOpen, editor, setEditor],
	);

	return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
	const shell = useContext(ShellContext);
	if (!shell) throw new Error("useShell needs <ShellProvider>");
	return shell;
}

/**
 * Registers the open file with the shell: its state and actions for the shortcuts.
 * Cleared when the editor unmounts.
 */
export function useEditorBridge(state: EditorState, actions: EditorActions) {
	const shell = useShell();
	const { setEditor } = shell;
	shell.actions.current = actions;
	const key = JSON.stringify(state);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `state`
	useEffect(() => setEditor(state), [key, setEditor]);
	const actionsRef = shell.actions;
	useEffect(
		() => () => {
			setEditor(null);
			actionsRef.current = null;
		},
		[setEditor, actionsRef],
	);
}
