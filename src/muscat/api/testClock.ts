// recover の 30 秒制限(lastAt)はモジュール内に残り、テストファイル間で共有される。時計もファイル間で共有して単調に進める
let clock = 10_000_000;
export const now = () => (clock += 100_000);
