import { Navigate, useNavigate, useParams } from "react-router-dom";
import { t } from "@jpa/core";
import { SetPicker } from "../components/SetPicker";
import { getSetOptions, lookalikeOptions } from "../lib/sets";
import { useSession } from "../lib/session";
import { useShellMeta } from "../lib/shell-meta";

function setsTitle(kind: string | undefined, mode: string | undefined): string {
  if (kind === "quiz") {
    if (mode === "kata") return t("title_read_kata");
    if (mode === "both") return t("title_read_both");
    return t("title_read_hira");
  }
  if (mode === "kata") return t("title_write_kata");
  if (mode === "both") return t("title_write_both");
  if (mode === "random") return t("title_write_random");
  if (mode === "lookalikes") return t("title_look");
  return t("title_write_hira");
}

export function SetsPage() {
  const { kind, mode } = useParams();
  const { handleSetChoice } = useSession();
  const navigate = useNavigate();
  const sessionKind = kind === "quiz" ? "quiz" : kind === "write" ? "write" : null;
  const lookalikes = sessionKind === "write" && mode === "lookalikes";
  const options = lookalikes ? lookalikeOptions() : getSetOptions();

  useShellMeta({ title: setsTitle(kind, mode), progress: "" });

  if (!sessionKind || !mode) return <Navigate to="/practice" replace />;

  return (
    <div>
      <p className="note">{lookalikes ? t("choose_set_note_look") : t("choose_set_note")}</p>
      <SetPicker
        options={options}
        onPick={(id) => {
          const next = handleSetChoice(id, { kind: sessionKind, mode });
          navigate(next === "quiz" ? "/practice/quiz" : "/practice/write");
        }}
      />
    </div>
  );
}
