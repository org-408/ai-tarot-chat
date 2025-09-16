export function SpreadLegend() {
  return (
    <div className="rounded-md border bg-white p-3 text-sm text-zinc-600">
      <strong>💡操作：</strong> セルをクリックで選択／もう一度クリックで解除
      <br />
      <span className="inline-block rounded border-2 px-2 py-0.5 mr-2 mt-2 bg-blue-500/80 border-blue-600">
        縦カード
      </span>
      <span className="inline-block rounded border-2 px-2 py-0.5 mr-2 mt-2 bg-pink-500/80 border-pink-600">
        横カード
      </span>
      <span className="inline-block rounded border-2 px-2 py-0.5 mt-2 border-sky-400">
        選択中
      </span>
    </div>
  );
}
