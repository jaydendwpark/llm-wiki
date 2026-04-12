import { cookies } from "next/headers";
import type { Theme } from "./context";

const VALID_THEMES: Theme[] = ["light", "dark", "kitsch", "dog", "cat"];

export async function getTheme(): Promise<Theme> {
  const c = await cookies();
  const val = c.get("theme")?.value;
  return VALID_THEMES.includes(val as Theme) ? (val as Theme) : "light";
}
