import { isNewer } from "../extension/version.js";

const version = Bun.argv[2] ?? "";
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("使い方: bun run release <version>  (例: bun run release 0.8.0)");
  process.exit(1);
}

const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

if ((await Bun.$`git status --porcelain`.text()).trim()) fail("作業ツリーが汚れています");
if ((await Bun.$`git branch --show-current`.text()).trim() !== "main") fail("main ブランチで実行してください");

const manifestFile = Bun.file("extension/manifest.json");
const manifest = JSON.parse(await manifestFile.text());
if (!isNewer(version, manifest.version)) fail(`${version} は現在の版 ${manifest.version} より新しくありません`);
manifest.version = version;
await Bun.write(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

// dist は git 管理外で上書きビルドなので、古いファイルが zip に混ざらないよう消してから作る
await Bun.$`rm -rf extension/dist`;
await Bun.$`bun run build`;

const zip = `mu-rewrite-v${version}.zip`;
await Bun.$`cd extension && zip -r ../${zip} . -x "*.d.ts" -x "*.DS_Store"`;

const tag = `v${version}`;
await Bun.$`git commit -am ${"chore: release " + tag}`;
await Bun.$`git tag -a ${tag} -m ${tag}`;
await Bun.$`git push origin main --follow-tags`;

// push 済みなので再実行はできない。失敗したら手で作れるよう zip を残してコマンドを出す
const created = await Bun.$`gh release create ${tag} ${zip} --title ${tag} --generate-notes`.nothrow();
if (created.exitCode) fail(`Release の作成に失敗しました。手で実行してください: gh release create ${tag} ${zip} --title ${tag} --generate-notes`);
await Bun.$`rm ${zip}`;
