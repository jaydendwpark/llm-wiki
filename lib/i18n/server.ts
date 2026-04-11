import { cookies } from "next/headers";
import type { Locale } from "./translations";
import { createT } from "./translations";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const val = c.get("locale")?.value;
  return val === "ko" ? "ko" : "en";
}

export async function getT() {
  const locale = await getLocale();
  return createT(locale);
}
