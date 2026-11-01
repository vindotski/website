import { fn } from "./server-fns";

// The server functions the suites call, by file and export name.

const at = (file: string) => (name: string) => fn(`src/server/${file}.functions.ts`, name);
const auth = at("auth");
const onboarding = at("onboarding");
const sites = at("sites");
const users = at("users");
const files = at("files");
const content = at("content");
const contentTypes = at("content-types");
const settings = at("site-settings");
const images = at("images");
const passwordReset = at("password-reset");

export const F = {
	fetchUser: auth("fetchUser"),
	signIn: auth("signIn"),
	signOut: auth("signOut"),
	completeOnboarding: onboarding("completeOnboarding"),
	createSite: sites("createSite"),
	mySites: sites("mySites"),
	makeDefault: sites("makeDefault"),
	listUsers: users("listUsers"),
	inviteUser: users("inviteUser"),
	changeRole: users("changeRole"),
	removeUser: users("removeUser"),
	listFiles: files("listFiles"),
	saveEntryFile: files("saveEntryFile"),
	renameEntry: files("renameEntry"),
	setEntryStatus: content("setEntryStatus"),
	deleteEntry: content("deleteEntry"),
	createContentType: contentTypes("createContentType"),
	getSiteSettings: settings("getSiteSettings"),
	listDocumentImages: images("listDocumentImages"),
	uploadDocumentImage: images("uploadDocumentImage"),
	deleteDocumentImage: images("deleteDocumentImage"),
	checkEmailToken: passwordReset("checkEmailToken"),
	requestPasswordReset: passwordReset("requestPasswordReset"),
	setPasswordFromEmailLink: passwordReset("setPasswordFromEmailLink"),
};
