import { isNewer } from "../extension/version.js";

const version = Bun.argv[2] ?? "";
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("使い方: bun run release <version> [notes.md]  (例: bun run release 0.8.0 /tmp/notes.md)");
  process.exit(1);
}

const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

// 指定がなければ GitHub の自動生成。push 後に気付かないよう最初に確かめる
const notesPath = Bun.argv[3];
if (notesPath && !(await Bun.file(notesPath).exists())) fail(`${notesPath} が見つかりません`);
const notes = notesPath ? ["--notes-file", notesPath] : ["--generate-notes"];
if ((await Bun.$`git status --porcelain`.text()).trim()) fail("作業ツリーが汚れています");
if ((await Bun.$`git branch --show-current`.text()).trim() !== "main") fail("main ブランチで実行してください");
await Bun.$`git fetch origin main`;
if ((await Bun.$`git rev-list HEAD..origin/main --count`.text()).trim() !== "0") fail("origin/main より遅れています。pull してください");

const manifestFile = Bun.file("extension/manifest.json");
const manifest = JSON.parse(await manifestFile.text());
if (!isNewer(version, manifest.version)) fail(`${version} は現在の版 ${manifest.version} より新しくありません`);

// dist は git 管理外で上書きビルドなので、古いファイルが zip に混ざらないよう消してから作る。版を書く前に作り、失敗しても作業ツリーを汚さない
await Bun.$`rm -rf extension/dist`;
await Bun.$`bun run build`;

manifest.version = version;
await Bun.write(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

const zip = `mu-rewrite-v${version}.zip`;
// ストアに手で上げる用。目印は入れない(ストアが付ける update_url で見分ける)
const storeZip = `mu-rewrite-v${version}-store.zip`;
await Bun.$`cd extension && zip -r ../${storeZip} . -x "*.d.ts" -x "*.DS_Store"`;
// GitHub 版の zip にだけ目印を入れ、設定画面で開発版(リポジトリをそのまま読み込んだもの)と見分ける
await Bun.write("extension/channel.txt", "github");
await Bun.$`cd extension && zip -r ../${zip} . -x "*.d.ts" -x "*.DS_Store"`.finally(() => Bun.$`rm extension/channel.txt`);

const tag = `v${version}`;
await Bun.$`git commit -am ${"chore: release " + tag}`;
await Bun.$`git tag -a ${tag} -m ${tag}`;
await Bun.$`git push origin main --follow-tags`;

// push 済みなので再実行はできない。失敗したら手で作れるよう zip を残してコマンドを出す
const created = await Bun.$`gh release create ${tag} ${zip} --title ${tag} ${notes}`.nothrow();
if (created.exitCode) fail(`Release の作成に失敗しました。手で実行してください: gh release create ${tag} ${zip} --title ${tag} ${notesPath ? `--notes-file '${notesPath}'` : "--generate-notes"}`);
await Bun.$`rm ${zip}`;
console.log(`ストア用: ${storeZip} を Chrome ウェブストアのデベロッパー ダッシュボードから上げてください`);
