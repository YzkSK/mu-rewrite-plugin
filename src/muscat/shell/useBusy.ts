import { useSyncExternalStore } from "react";
import { isBusy, subscribeBusy } from "../api/busy";

/** いま通信かドライバ操作が走っているか */
export const useBusy = (): boolean => useSyncExternalStore(subscribeBusy, isBusy, () => false);
