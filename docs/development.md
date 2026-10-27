# 開発ガイド

## 準備

```sh
bun install
bun run build      # extension/dist/ に 4 つのバンドルを出す
```

`chrome://extensions` で `extension/` フォルダを「パッケージ化されていない拡張機能」として読み込みます。コードを変えたら `bun run build` して拡張を再読み込みします。

ポータルのページで `localStorage["mu-dev"] = "1"` にしておくと、content script から拡張の再読み込みを頼めます(`extension/background.js` 参照)。MUSCAT でも同じ値にしておくと、「読み取れませんでした」になったときの元のエラーがコンソールに出ます。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `bun run build` | MUSCAT・ポータル・LMS・pdf.js の 4 本をビルド |
| `bun test` | テスト(happy-dom。`test-setup.ts` で登録) |
| `bun run typecheck` | 型チェック |
| `bun run release <version>` | リリース(後述) |

## 構成

```
extension/            拡張そのもの(この中身が配布 zip になる)
  manifest.json       Manifest V3。content script はサイトごとに 1 本
  background.js       service worker(更新確認・MUSCAT の入り直し・LMS の期限取得など)
  options.html/.js    アイコンから開く設定画面
  dist/               ビルド出力(git 管理外)
src/
  muscat/             MUSCAT。entry.tsx → muscat-react.js
    api/              通信層(driver: 画面操作の再現、parse: HTML の読み取り、virtual: 仮想の操作)
    screens/          画面ごとの React コンポーネント
    shell/            枠(サイドバー・表示の大きさなど)
  portal/             MU ポータル。entry.tsx → portal-react.js
  lms/                MU-LMS。entry.tsx → lms-react.js、pdfjs.ts → lms-pdf.js
  components/         3 サイト共通の部品(starwind/ は Starwind UI)
  ui/                 共通の配色(tokens.css)など
scripts/release.ts    リリーススクリプト
```

ビルドの出し分けは `vite.config.ts` の `TARGETS`(`--mode portal|lms|pdf`、既定は MUSCAT)です。どれも `extension/dist/` に IIFE(pdf.js だけ ES module)で出します。

## 設計方針

詳しい仕組みは [architecture.md](architecture.md) を見てください。

- **元のページに頼らない。** 元のボタンを押したり DOM を借りたりせず、元のサイトと同じ通信を自分で送って結果を描きます。
- **MUSCAT は JSF の画面遷移(POST)を再現する。** 操作できる要素に `ref` を振り(`src/muscat/api/driver/locator.ts`)、「操作名 + ref」で通信を組み立てます。画面の URL を直接 GET すると空の 500 が返るので、再読み込み時は background が SSO の入口から入り直させ、戻った先で元の画面を開き直します。
- **LMS は Moodle の Ajax(`/lib/ajax/service.php`)を使う。** 別オリジンの取得は background が Cookie 付きで行います。
- **見た目は落ち着いた単色系。** 色は `src/ui/tokens.css` に集め、設定画面もそれに揃えています。

## テスト

パーサーや通信の組み立てはテストを付けます。実際の HTML の形に合わせるため、実機の応答を元にしたフィクスチャで確かめてください。

## リリース

`main` でクリーンな状態から実行します。

```sh
bun run release 1.0.4
```

`manifest.json` の版を上げ → `extension/dist` を消してビルド → zip を作成 → コミット・タグ・push → `gh release create` で zip を添付、まで行います。拡張は GitHub の最新 Release を見て更新を知らせるので、zip 名(`mu-rewrite-vX.Y.Z.zip`)は変えないでください。`gh` のログインが必要です。
