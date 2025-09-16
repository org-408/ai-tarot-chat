export type SpreadCell = {
  x: number;
  y: number;
  vLabel?: string;
  hLabel?: string;
  vOrder?: number;
  hOrder?: number;
};

export type SpreadMeta = {
  name: string;
  category:
    | "総合"
    | "恋愛"
    | "仕事"
    | "金運"
    | "健康"
    | "学業"
    | "人間関係"
    | "その他";
  level: "初心者" | "中級者" | "上級者" | "最上級";
  plan: "フリー" | "スタンダード" | "コーチング";
  guide?: string;
  updatedAt?: string;
};

export type Spread = {
  id: string;
  meta: SpreadMeta;
  cells: SpreadCell[];
};
