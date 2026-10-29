import { isNewer } from "../extension/version.js";

const version = Bun.argv[2] ?? "";
const m = /^(\d+\.\d+\.\d+)(?:-(?:alpha|beta)(?:\.\d+)?)?$/.exec(version);
if (!m) {
  console.error("使い方: bun run release <version> [notes.md]  (例: bun run release 0.8.0 /tmp/notes.md、1.1.0-beta.2)");
  process.exit(1);
}
const target = m[1]!;
const pre = target !== version;

const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

// 指定がなければ GitHub の自動生成。push 後に気付かないよう最初に確かめる
const notesPath = Bun.argv[3];
if (notesPath && !(await Bun.file(notesPath).exists())) fail(`${notesPath} が見つかりません`);
const notes = notesPath ? ["--notes-file", notesPath] : ["--generate-notes"];
if ((await Bun.$`git status --porcelain`.text()).trim()) fail("作業ツリーが汚れています");
// main からは正式版だけ、1.0.7-alpha のようなブランチからはその版のプレリリースだけを出す
const branch = (await Bun.$`git branch --show-current`.text()).trim();
if (branch === "main") {
  if (pre) fail("main からはプレリリースを出せません。1.0.7-alpha のようなブランチで実行してください");
} else if (!/^\d+\.\d+\.\d+-(alpha|beta)$/.test(branch)) fail("main か 1.0.7-alpha のようなブランチで実行してください");
else if (!pre || !version.startsWith(branch)) fail(`${branch} ブランチからは ${branch} または ${branch}.N だけを出せます`);
await Bun.$`git fetch origin ${branch}`;
if ((await Bun.$`git rev-list HEAD..origin/${branch} --count`.text()).trim() !== "0") fail(`origin/${branch} より遅れています。pull してください`);

const manifestFile = Bun.file("extension/manifest.json");
const manifest = JSON.parse(await manifestFile.text());
// 正式版は x.y.z、プレリリースは「今の正式版.N」で数える(manifest の version は数字だけ)。どちらも次の正式版より小さい
const [a, b, c, n] = String(manifest.version).split(".");
const base = `${a}.${b}.${c}`;
if (!isNewer(target, base)) fail(`${target} は現在の正式版 ${base} より新しくありません`);
if ((await Bun.$`git tag -l ${"v" + version}`.text()).trim()) fail(`v${version} は既にあります`);
// 1.1.0-beta.2 → "1.1.0.1.2"。alpha < beta、番号なしは 0 として、前のプレリリースより戻らないようにする
const order = (v: string) => v.replace(/-(alpha|beta)(?:\.(\d+))?$/, (_, l, k) => `.${l === "beta" ? 1 : 0}.${k ?? 0}`);
if (pre && manifest.version_name && !isNewer(order(version), order(manifest.version_name))) fail(`${version} は前のプレリリース ${manifest.version_name} より新しくありません`);

// dist は git 管理外で上書きビルドなので、古いファイルが zip に混ざらないよう消してから作る。版を書く前に作り、失敗しても作業ツリーを汚さない
await Bun.$`rm -rf extension/dist`;
await Bun.$`bun run build`;

manifest.version = pre ? `${base}.${Number(n ?? 0) + 1}` : version;
if (pre) manifest.version_name = version;
else delete manifest.version_name;
await Bun.write(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

const zip = `mu-rewrite-v${version}.zip`;
// ストアに手で上げる用。目印は入れない(ストアが付ける update_url で見分ける)。プレリリースはストアに出さない
const storeZip = `mu-rewrite-v${version}-store.zip`;
if (!pre) await Bun.$`cd extension && zip -r ../${storeZip} . -x "*.d.ts" -x "*.DS_Store"`;
// GitHub 版の zip にだけ目印を入れ、設定画面で開発版(リポジトリをそのまま読み込んだもの)と見分ける
await Bun.write("extension/channel.txt", "github");
await Bun.$`cd extension && zip -r ../${zip} . -x "*.d.ts" -x "*.DS_Store"`.finally(() => Bun.$`rm extension/channel.txt`);

const tag = `v${version}`;
await Bun.$`git commit -am ${"chore: release " + tag}`;
await Bun.$`git tag -a ${tag} -m ${tag}`;
await Bun.$`git push origin ${branch} --follow-tags`;

// push 済みなので再実行はできない。失敗したら手で作れるよう zip を残してコマンドを出す
// プレリリースは releases/latest に出ないので、GitHub 版の更新確認には正式版だけが届く
const prerelease = pre ? ["--prerelease"] : [];
const created = await Bun.$`gh release create ${tag} ${zip} --title ${tag} ${prerelease} ${notes}`.nothrow();
if (created.exitCode) fail(`Release の作成に失敗しました。手で実行してください: gh release create ${tag} ${zip} --title ${tag} ${prerelease.join(" ")} ${notesPath ? `--notes-file '${notesPath}'` : "--generate-notes"}`);
await Bun.$`rm ${zip}`;
if (!pre) console.log(`ストア用: ${storeZip} を Chrome ウェブストアのデベロッパー ダッシュボードから上げてください`);
