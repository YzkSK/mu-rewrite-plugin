import { IconMenu2 } from "@tabler/icons-react";
import StarwindButton from "@/components/starwind/button/Button";
import Badge from "@/components/starwind/badge/Badge";

type Props = { title: string; onMenu: () => void; user?: string };

export function Header({ title, onMenu, user }: Props) {
  return (
    <header className="flex items-center gap-3 bg-card px-4 py-3 shadow-sm">
      <StarwindButton variant="primary" size="icon" className="rounded-full" aria-label="メニュー" onClick={onMenu}>
        <IconMenu2 />
      </StarwindButton>
      <h1 className="flex-1 text-lg font-bold text-primary">{title}</h1>
      {user ? <Badge variant="secondary">{user}</Badge> : null}
    </header>
  );
}
