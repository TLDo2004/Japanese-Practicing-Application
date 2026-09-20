import { BASIC_ROWS, setLabelKana } from "@jpa/kana";
import { t } from "@jpa/core";

export type SetOption = {
  id: string;
  group: "rows" | "special" | "complete";
  label: string;
  hint: string;
};

export function getSetOptions(): SetOption[] {
  return [
    ...BASIC_ROWS.map((row) => {
      const n = row.cells.filter(Boolean).length;
      const kana = setLabelKana(row);
      return {
        id: row.id,
        group: "rows" as const,
        label: t("row_of", { kana }),
        hint: t(n === 1 ? "n_chars" : "n_chars_plural", { n }),
      };
    }),
    { id: "voiced", group: "special", label: t("set_voiced"), hint: t("set_voiced_hint") },
    { id: "yoon", group: "special", label: t("set_yoon"), hint: t("set_yoon_hint") },
    { id: "basic46", group: "complete", label: t("set_basic46"), hint: t("set_basic46_hint") },
    { id: "full71", group: "complete", label: t("set_full71"), hint: t("set_full71_hint") },
    { id: "all", group: "complete", label: t("set_all"), hint: t("set_all_hint") },
  ];
}

export function setLabel(setId: string): string {
  return getSetOptions().find((opt) => opt.id === setId)?.label || setId;
}

export function lookalikeOptions(): SetOption[] {
  return [
    { id: "lookalikes-hira", group: "complete", label: t("look_hira"), hint: t("look_hira_hint") },
    { id: "lookalikes-kata", group: "complete", label: t("look_kata"), hint: t("look_kata_hint") },
    { id: "lookalikes-both", group: "complete", label: t("look_both"), hint: t("look_both_hint") },
    { id: "lookalikes-random", group: "complete", label: t("look_random"), hint: t("look_random_hint") },
  ];
}
