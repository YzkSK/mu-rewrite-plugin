import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SupersededError } from "@/muscat/api/errors";
import { fakeClient } from "../fakeClient";
import { useCourse } from "./useCourse";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("画面を離れた印(空のエラー文)のときは、error にせず読み込み中のまま", async () => {
  const client = fakeClient({ getCourse: () => Promise.reject(new SupersededError()) });
  let course!: ReturnType<typeof useCourse>;
  const Probe = () => {
    course = useCourse(client, { title: "合成演習" });
    return null;
  };
  await act(async () => createRoot(document.createElement("div")).render(<Probe />));
  expect(course.status).toBe("loading");
  expect(course.error).toBeUndefined();
});
