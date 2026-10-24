import type { ReactNode } from "react";
import StarwindButton from "@/components/starwind/button/Button";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

export function Button({ children, onClick, variant = "primary", disabled }: Props) {
  return (
    <StarwindButton variant={variant} size="sm" onClick={onClick} disabled={disabled}>
      {children}
    </StarwindButton>
  );
}
