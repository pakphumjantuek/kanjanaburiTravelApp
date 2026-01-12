import { useCallback } from "react";
import { useLogBehaviorMutation } from "./behaviorApi";
import type { CreateBehaviorLogRequest } from "./behaviorTypes";
import { getAnonymousId } from "./anon";

export function useBehaviorLogger() {
  const [logBehavior] = useLogBehaviorMutation();

  return useCallback(
    async (payload: Omit<CreateBehaviorLogRequest, "clientEventId" | "anonymousId">) => {
      const clientEventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      await logBehavior({
        ...payload,
        clientEventId,
        anonymousId: getAnonymousId(),
      }).unwrap();
    },
    [logBehavior]
  );
}
