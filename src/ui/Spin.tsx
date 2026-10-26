/**
 * 回る読み込みのしるし。枠線の円を transform で回すので、元のページの重い処理で画面が止まっても、ブラウザが別に回し続ける
 * (SVG を回すと一緒に止まった。教室予約で 1 回 0.4〜2 秒。実機で測定)
 */
export function Spin({ className = "size-5" }: { className?: string }) {
  return <span role="status" aria-label="読み込み中" className={`mu-spin inline-block shrink-0 rounded-full border-2 border-border border-t-primary ${className}`} />;
}
