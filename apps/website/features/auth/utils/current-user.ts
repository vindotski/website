import "server-only";
import { headers } from "next/headers";
import { USER_HEADER } from "./session";

export type CurrentUser = { id: string; email: string };

// The signed-in user, as the proxy checked it for this request. Null for a
// guest. Only for routes the proxy's matcher covers
export async function currentUser(): Promise<CurrentUser | null> {
  const value = (await headers()).get(USER_HEADER);
  return value ? (JSON.parse(value) as CurrentUser) : null;
}
