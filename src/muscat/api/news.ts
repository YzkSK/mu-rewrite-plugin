import type { Core } from "./core";
import { parseNews } from "./parse/news";
import type { NewsPage } from "./types";

/** 生きたページ(掲示板)を読む。操作は driveLive で、返した ref を使う */
export const readNews = (core: Core): Promise<NewsPage> => core.runLive(async (live) => parseNews(live.doc));
