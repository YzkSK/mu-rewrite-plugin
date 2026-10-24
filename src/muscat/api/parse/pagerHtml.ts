/** テスト用: 実機(PrimeFaces の p:dataTable)の上のページャーと同じ形の HTML */
export const pagerHtml = (tableId: string, current: string, opts: { page?: number; disabledPrev?: boolean } = {}) => {
  const page = opts.page ?? 1;
  const off = (b: boolean) => (b ? " ui-state-disabled" : "");
  return `<div id="${tableId}_paginator_top" class="ui-paginator ui-paginator-top" role="navigation"><span class="ui-paginator-current">${current}</span>
    <a class="ui-paginator-first${off(page === 1)}"><span>F</span></a><a class="ui-paginator-prev${off(page === 1)}"><span>P</span></a>
    <span class="ui-paginator-pages"><a class="ui-paginator-page ${page === 1 ? "ui-state-active" : ""}">1</a><a class="ui-paginator-page ${page === 2 ? "ui-state-active" : ""}">2</a></span>
    <a class="ui-paginator-next"><span>N</span></a><a class="ui-paginator-last"><span>E</span></a>
    <select class="ui-paginator-rpp-options"><option value="10" selected>10</option><option value="25">25</option></select></div>`;
};
