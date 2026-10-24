import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { CourseDetail } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type CourseKey = { title: string; code?: string };
export type CourseState = { status: "loading" | "ready" | "error"; course?: CourseDetail; error?: string };

/** initial はテスト用(effect が動かない描画で状態を固定する) */
export function useCourse(client: MuscatClient, key: CourseKey, initial?: CourseState) {
  const [state, setState] = useState<CourseState>(initial ?? { status: "loading" });
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    client.getCourse({ title: key.title, code: key.code }).then(
      (course) => alive && setState({ status: "ready", course }),
      (e) => alive && setState({ status: "error", error: errorMessage(e) }),
    );
    return () => {
      alive = false;
    };
  }, [client, key.title, key.code, tries]);

  return { ...state, reload: () => setTries((n) => n + 1) };
}
