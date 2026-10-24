import type { ReactNode } from "react";
import StarwindButton from "@/components/starwind/button/Button";
import { Spinner } from "@/components/starwind/spinner";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  /** 押した直後の処理中。丸いアイコンに変わり、押せなくなる(文字は透明で残すので幅は動かない) */
  loading?: boolean;
  /** 記号だけのボタンの読み上げ名 */
  label?: string;
};

export function Button({ children, onClick, variant = "primary", disabled, loading, label }: Props) {
  return (
    <StarwindButton variant={variant} size="sm" onClick={onClick} disabled={disabled || loading} className="relative" aria-busy={loading || undefined} aria-label={label}>
      {loading ? (
        <>
          <span className="invisible">{children}</span>
          <Spinner className="absolute size-4" />
        </>
      ) : (
        children
      )}
    </StarwindButton>
  );
}
