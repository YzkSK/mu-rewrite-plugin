# 仕組み

この拡張は、3 つのサイトそれぞれのページに content script を差し込み、**元のアプリを動かさずに自分の React 画面を描く**ものです。データは元のアプリと同じ通信を自分で送って取ります。

## 共通の流れ

どのサイトも `document_start` で動き、だいたい次の順に進みます。

```
ページ読み込み開始(document_start)
  │
  ├─ 対象外のページ / 「元の画面で開く」の印がある → 何もしない(元のアプリがそのまま動く)
  │
  ├─ 覆いを掛ける            src/muscat/shell/pre.ts   installPreHide
  ├─ 元の script を止める    src/ui/block.ts           blockNativeScripts
  ├─ データを取る            各サイトの api / data
  ├─ Shadow DOM に描く       src/muscat/shell/mount.ts mountShadowRoot
  └─ 覆いを外す              releasePreHide
       │
       └─ 失敗したら: 止めた script を戻して元の画面を見せる、または失敗の画面を出す
```

### 覆い(pre-hide)

描き終えるまで元の body を隠すだけで、枠や文字は描きません。Chrome は次のページが中身を描くまで前のページを表示し続けるので、先に空の枠を描くとそこで前のページが消え、「枠 → 画面」とちらつくためです。書体の定義(CSS)が届くまでは最大 300ms 待ちます。MUSCAT は失敗しても 20 秒で覆いを外す保険があります。

### 元の script を止める

`src/ui/block.ts` が、同じオリジンの `<script src>` と中身だけの `<script>` を実行前に無効にし、`modulepreload` も消します。描けないページでは戻して元の画面を動かします(`unblockNativeScripts`)。

### Shadow DOM

画面は Shadow DOM の中に描き、元のサイトの CSS と干渉しないようにしています。配色は `src/ui/tokens.css` を Shadow DOM に入れて使います。MUSCAT の元ページは `html` が 14px なので、rem の基準を 16px に揃えています。

### 「元の画面で開く」

各サイトのメニューにある「元の画面で開く」は、印を付けて読み直すだけです。印があると content script は何もしないので、元のアプリがそのまま動きます。

## MUSCAT

MUSCAT は JSF + PrimeFaces のアプリで、API はありません。画面の遷移はすべて POST で、サーバー側が「今の画面」の状態(ViewState)を持っています。そのため、**元の画面の部品が送るはずの通信を再現する**形で作っています。

### 層

```
screens/      React の画面。client の関数を呼ぶ
  │
api/client.ts 画面向けの操作(時間割を読む、シラバスを検索する、設定を保存する…)
  │
api/core.ts   直列キュー・画面の移動・状態喪失からの復帰
  │
api/virtual/  元の部品(PrimeFaces.ab の onclick など)を読み、同じ通信を組み立てる
api/driver/   操作できる要素に ref を振る、操作の手順(DriveStep)
api/parse/    応答の HTML から必要な値を読む
```

### 複製の Document と ref

core は、元のページを `DOMParser` で読んだ **複製の Document**(session)を持ちます。画面に見えている元の DOM は使いません。

複製の中の操作できる要素(`input`・`select`・`button`・`onclick` 付きの `a`・タブなど)に `data-mu-ref` で連番を振ります(`driver/locator.ts`)。画面からは「操作名 + ref」で頼みます。

```ts
// 例: 値を入れてからボタンを押す
drive([
  { kind: "set", ref: "c12", value: "2026" },
  { kind: "click", ref: "c30" },
]);
```

`virtual/vdrive.ts` は ref の要素の `onclick` / `onchange` から `PrimeFaces.ab({...})` の設定を読み(`virtual/ab.ts`)、PrimeFaces と同じ本文の部分更新リクエストを組み立てて送ります。応答の XML(`<update>`)は複製の Document に反映します(`partial.ts` の `applyPartialResponse`)。応答が画面ごとの置き換えなら、新しい画面として取り込みます。

注意する点:

- 送るときは、`method=post` のすべてのフォームに ViewState を入れます。フォームの差し替えで ViewState の項目が消えていると、サーバーは 2 回目以降の変更を受け付けません。
- `rx-token` は menuForm を含む全フォームで揃えます。

### 直列キューと epoch

サーバーは「今の画面」を 1 つしか持たないので、通信は 1 本ずつ直列キューで送ります。

画面の移動を頼む・画面が替わるたびに `epoch` を増やします。操作は積んだときの epoch を持ち、動き出すときに違っていたら捨てます(`SupersededError`)。移動中に積まれた操作は移る前の画面のものなので、いつも捨てます。続けてメニューを押したときは、最後の移動だけが残ります。

読むためだけに別の画面を開く操作は `aside` で行い、終わったら見せている画面に戻します。

### 状態喪失と入り直し

MUSCAT は画面の URL を直接 GET すると空の 500 を返し、再読み込みが Chrome のエラー画面になります。そこで `extension/background.js` が:

1. `/up/` への GET(再読み込みなど)を `webRequest` で見つけ、その時点で SSO の入口(`ShibbolethAuthServlet`)へ移します。500 以上が返ったときも同じです。
2. 直前の画面を覚えておき、入り直して 30 秒以内なら content script に返します。
3. content script はホームに戻ったあと、その画面を開き直します。

入り直しの途中やサーバーが落ちているときに繰り返さないよう、5 分間の印を付けています。

通信中にセッションが切れた(状態喪失)ときは、core が一度だけ復帰してやり直します。

## MU ポータル

ポータルは JSON の API を持つ SPA なので、それを直接呼びます(`src/portal/api.ts`)。

| API | 用途 |
| --- | --- |
| `/api/page`、`/api/page/view/<slug>` | ページの木と、各ページのブロック |
| `/api/information/1?…` | お知らせの一覧 |
| `/api/information-category/tree` | お知らせの分類 |
| `/api/shared-item/<n>/<folder>` | キャビネット |

- `/dashboard` 以下を描きます。`route.ts` がどのページを描くかを決めます。
- 未ログインのときは HTTP 200 で `user: null` が返ります。その場合は `/` へ移り、SSO で入り直します(60 秒以内に試していれば繰り返しません)。
- 本文の HTML は外部由来なので、`lib/sanitize.ts` の許可リストで通します。URL は http(s) だけ、style は文字の装飾だけを許します。

## MU-LMS

MU-LMS は Moodle(Snap テーマ)です。

- データは Moodle の Web サービスを `/lib/ajax/service.php?sesskey=…` で呼んで取ります(`src/lms/api.ts`)。エラーも HTTP 200 の配列で返ります。`sesskey` はページから読みます。
- Web サービスに無いもの(課題のページ・提出フォーム・コースのページ・評定など)は、ページの HTML を取って読みます。
- 提出期限は別オリジンからは取れないので、background の service worker が Cookie 付きで取ります。
- PDF のプレビューは pdf.js を別のバンドル(`lms-pdf.js`、ES module)にし、開いたときだけ読み込みます。
- ログアウトや、ログインから戻っても未ログインだった場合は `LmsGate` が案内を出します。

## background(service worker)

`extension/background.js` の役割は次の 4 つです。

- **更新確認**: GitHub の `releases/latest` を見て、新しければ版と zip の URL を `chrome.storage.local` の `mu-update` に保存します。設定画面がそれを表示します。
- **MUSCAT の入り直し**: 上で説明したとおりです。
- **LMS の提出期限の取得**: 60 日前から取得し、過去と未来を分けて取ります(古い期限切れで件数の上限を使い切らないため)。
- **MUSCAT の時間割を通信だけで取る**: 中継ページ → autoLogin → メニューの「学生時間割表」の順に取ります。サーバー側の「今の画面」が変わるので、MUSCAT のタブが開いていれば取りません。

## 表示の大きさ

設定画面は `chrome.storage.sync` の `mu-zoom`(90 / 100 / 112 / 125)に保存します。各サイトはこの値の変更を監視していて、開いている画面にもすぐ反映されます。値の候補は `src/muscat/shell/zoom.ts` の `ZOOMS` と揃えてください。
