type Item = { label: string; onSelect: () => void };
type Props = { open: boolean; items: Item[]; onClose: () => void };

// 本文をずらすのは配置側の仕事。ここは左ドロワー本体だけ。
export function Drawer({ open, items, onClose }: Props) {
  return (
    <aside
      aria-hidden={!open}
      inert={!open}
      className={`w-64 shrink-0 overflow-hidden bg-card transition-[margin] duration-200 ${open ? "ml-0" : "-ml-64"}`}
    >
      <nav className="flex flex-col p-2">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="rounded-md px-3 py-2 text-left text-foreground hover:bg-accent"
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
