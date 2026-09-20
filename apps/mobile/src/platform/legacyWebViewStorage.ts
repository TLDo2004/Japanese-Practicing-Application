import { NativeModules, Platform } from "react-native";
import { STORAGE_KEY } from "@jpa/core";

type LegacyWebViewStorageNative = {
  readLocalStorageItem: (key: string) => Promise<string | null>;
};

/**
 * Reads Capacitor WebView localStorage for the same applicationId upgrade path.
 * Returns null on iOS, web, missing native module, or any failure (never throws).
 */
export async function readLegacyCapacitorProgressRaw(
  readItem: (key: string) => Promise<string | null> = defaultNativeRead,
): Promise<string | null> {
  try {
    return await readItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function defaultNativeRead(key: string): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  const mod = NativeModules.LegacyWebViewStorage as LegacyWebViewStorageNative | undefined;
  if (!mod?.readLocalStorageItem) return null;
  const value = await mod.readLocalStorageItem(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}
