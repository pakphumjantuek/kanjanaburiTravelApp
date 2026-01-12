import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";
import type { PlaceDto } from "../../places/placeTypes";
import { API_BASE_URL } from "../../../config/env";

type State = { map: Map<number, PlaceDto>; isLoading: boolean };
type Options = { limit?: number };

export function usePlacesByIds(placeIds: number[], opts?: Options) {
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);

  const ids = useMemo(() => {
    return Array.from(new Set(placeIds.filter((x) => x > 0))).sort((a, b) => a - b);
  }, [placeIds]);

  const idsKey = useMemo(() => ids.join(","), [ids]);

  const [state, setState] = useState<State>({ map: new Map(), isLoading: false });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {

      if (!idsKey) {
        setState({ map: new Map(), isLoading: false });
        return;
      }

      setState((s) => ({ ...s, isLoading: true }));

      try {
        const limit = opts?.limit ?? 50;

        const results = await Promise.all(
          ids.slice(0, limit).map(async (id) => {
            const url = `${API_BASE_URL}/Place/${id}`;
            const res = await fetch(url, {
              method: "GET",
              headers: {
                Accept: "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
            });

            if (!res.ok) {
              const txt = await res.text().catch(() => "");
              console.log("Place fetch failed:", { id, url, status: res.status, body: txt.slice(0, 120) });
              return null;
            }

            const json = await res.json();
            if (!json?.isSuccess || !json?.result) {
              console.log("Place fetch not success:", { id, url, json });
              return null;
            }

            return json.result as PlaceDto;
          })
        );

        if (cancelled) return;

        const map = new Map<number, PlaceDto>();
        for (const p of results) if (p) map.set(p.placeId, p);

        setState({ map, isLoading: false });
      } catch (e: any) {
        if (cancelled) return;
        setState({ map: new Map(), isLoading: false });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [idsKey, accessToken, opts?.limit]);

  return state;
}
