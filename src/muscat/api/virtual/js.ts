/** function(...){...} の本文の文字列(読み取るだけで動かさない) */
export class Fn {
  constructor(readonly raw: string) {}
}

const SKIP = Symbol("skip");
export type Val = unknown;

/** JS のオブジェクトリテラルを eval せずに読む小さな字句解析。function は Fn、読めない式は読み飛ばす */
export class Reader {
  i: number;
  constructor(readonly t: string, start: number) {
    this.i = start;
  }
  ws() {
    while (this.i < this.t.length && /\s/.test(this.t[this.i]!)) this.i++;
  }
  str(): string {
    const q = this.t[this.i++]!;
    let out = "";
    while (this.i < this.t.length && this.t[this.i] !== q) {
      let c = this.t[this.i++]!;
      if (c === "\\") {
        c = this.t[this.i++]!;
        out += c === "n" ? "\n" : c === "t" ? "\t" : c === "u" ? String.fromCharCode(parseInt(this.t.slice(this.i, (this.i += 4)), 16)) : c;
      } else out += c;
    }
    this.i++;
    return out;
  }
  /** 対応する閉じ括弧まで飛ばす(文字列の中の括弧は数えない) */
  skipBlock() {
    let depth = 0;
    while (this.i < this.t.length) {
      const c = this.t[this.i]!;
      if (c === '"' || c === "'") {
        this.str();
        continue;
      }
      this.i++;
      if (c === "(" || c === "{" || c === "[") depth++;
      else if (c === ")" || c === "}" || c === "]") if (--depth <= 0) return;
    }
  }
  /** 値の終わり(深さ 0 の , } ])まで飛ばす。読めない式(正規表現・アロー関数・演算など)用 */
  loose() {
    let depth = 0;
    while (this.i < this.t.length) {
      const c = this.t[this.i]!;
      if (c === '"' || c === "'") {
        this.str();
        continue;
      }
      if (depth === 0 && (c === "," || c === "}" || c === "]")) return;
      this.i++;
      if (c === "(" || c === "{" || c === "[") depth++;
      else if (c === ")" || c === "}" || c === "]") depth--;
    }
  }
  value(): Val {
    this.ws();
    const c = this.t[this.i]!;
    if (c === '"' || c === "'") return this.str();
    if (c === "{") return this.object();
    if (c === "[") {
      this.i++;
      const arr: Val[] = [];
      for (this.ws(); this.i < this.t.length && this.t[this.i] !== "]"; this.ws()) {
        const at = this.i;
        const v = this.value();
        if (v !== SKIP) arr.push(v);
        this.ws();
        if (this.t[this.i] === ",") this.i++;
        else if (this.i === at) this.i++; // 進まなければ 1 文字送る(無限ループ防止)
      }
      this.i++;
      return arr;
    }
    const start = this.i;
    const word = /^[\w$.-]+/.exec(this.t.slice(this.i))?.[0];
    if (word === "function") {
      this.i += word.length;
      this.ws();
      this.skipBlock(); // (引数)
      this.ws();
      this.skipBlock(); // { 本体 }
      return new Fn(this.t.slice(start, this.i));
    }
    if (word) {
      this.i += word.length;
      const after = this.i;
      this.ws();
      if (",}]".includes(this.t[this.i] ?? "}")) {
        if (word === "true") return true;
        if (word === "false") return false;
        if (word === "null") return null;
        if (!Number.isNaN(Number(word))) return Number(word);
        return SKIP;
      }
      this.i = after;
    }
    this.loose(); // PF('x') など呼び出しや式は読み捨てる
    return SKIP;
  }
  object(): Record<string, Val> {
    this.i++; // {
    const o: Record<string, Val> = {};
    for (this.ws(); this.i < this.t.length && this.t[this.i] !== "}"; this.ws()) {
      let k: string;
      if (this.t[this.i] === '"' || this.t[this.i] === "'") k = this.str();
      else {
        k = /^[\w$]+/.exec(this.t.slice(this.i))?.[0] ?? "";
        if (!k) throw new Error("js: 読めないキー");
        this.i += k.length;
      }
      this.ws();
      if (this.t[this.i++] !== ":") throw new Error("js: : がない");
      const v = this.value();
      if (v !== SKIP) o[k] = v;
      this.ws();
      if (this.t[this.i] === ",") this.i++;
    }
    if (this.t[this.i] !== "}") throw new Error("js: 閉じていない");
    this.i++;
    return o;
  }
}
