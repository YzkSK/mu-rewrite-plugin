import { GlobalRegistrator } from "@happy-dom/global-registrator";

// 読み込みを止めた script などは、裏でエラーを投げず「読み込めた」扱いにする(そのエラーが別のテストの失敗に数えられて、時々落ちた)
GlobalRegistrator.register({ url: "https://muscat.example/uprx/up/bs/Bsa00101.xhtml", settings: { handleDisabledFileLoadingAsSuccess: true } });

// 拡張の外で動くテスト用の最小スタブ(書体の URL を作るだけ)
(globalThis as { chrome?: unknown }).chrome ??= { runtime: { getURL: (p: string) => `chrome-extension://test/${p}` } };
