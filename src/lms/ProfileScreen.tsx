import type { ProfilePage } from "./profile";
import { Box, Note, Row } from "./parts";

const LINKS = [
  { title: "プロファイルを編集する", href: "/user/edit.php" },
  { title: "プレファレンス", href: "/user/preferences.php" },
  { title: "プライベートファイル", href: "/user/files.php" },
];

/** プロファイル。左に名前・メール・タイムゾーン、右に設定のリンク(どれも元の画面へ) */
export function ProfileScreen({ page }: { page: ProfilePage }) {
  return (
    <div className="mx-auto grid w-full max-w-[1000px] items-start gap-4 p-4 min-[800px]:grid-cols-[minmax(0,1fr)_300px]">
      <Box title={page.name || "プロファイル"}>
        {page.items.length ? (
          <dl className="m-0 p-0">
            {page.items.map((i) => (
              <div key={i.label} className="flex gap-3 border-b border-border px-4 py-2.5 text-[13.5px] last:border-b-0 max-[767px]:flex-col max-[767px]:gap-0.5">
                <dt className="w-32 flex-none text-muted-foreground max-[767px]:w-auto max-[767px]:text-[12px]">{i.label}</dt>
                <dd className="m-0 min-w-0 flex-1 [overflow-wrap:anywhere]">{i.value}</dd>
              </div>
            ))}
          </dl>
        ) : <Note>表示できる情報がありません</Note>}
      </Box>
      <Box title="設定・そのほか">
        <ul className="m-0 list-none p-0">
          {LINKS.map((l) => <Row key={l.href}><a className="text-[13.5px] text-primary hover:underline max-[767px]:flex max-[767px]:min-h-11 max-[767px]:flex-1 max-[767px]:items-center" href={l.href}>{l.title}</a></Row>)}
        </ul>
      </Box>
    </div>
  );
}
