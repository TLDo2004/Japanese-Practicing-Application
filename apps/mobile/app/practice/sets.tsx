import { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { t } from "@jpa/core";
import { Eyebrow, RowItem } from "../../src/components/ui";
import { getSetOptions, lookalikeOptions, type SetOption } from "../../src/lib/sets";
import { useSession } from "../../src/session/SessionContext";
import { colors, fonts, space } from "../../src/theme";

const GROUPS = [
  { id: "rows", titleKey: "group_rows" },
  { id: "special", titleKey: "group_special" },
  { id: "complete", titleKey: "group_complete" },
] as const;

function setsTitle(kind: string, mode: string): string {
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

export default function SetsScreen() {
  const { kind, mode } = useLocalSearchParams<{ kind: string; mode: string }>();
  const pending = {
    kind: kind === "quiz" ? "quiz" as const : "write" as const,
    mode: mode || "hira",
  };
  const { handleSetChoice } = useSession();
  const router = useRouter();
  const navigation = useNavigation();
  const lookalikes = pending.kind === "write" && pending.mode === "lookalikes";
  const options: SetOption[] = lookalikes ? lookalikeOptions() : getSetOptions();

  useLayoutEffect(() => {
    navigation.setOptions({ title: setsTitle(pending.kind, pending.mode) });
  }, [navigation, pending.kind, pending.mode]);

  const onPick = (setId: string) => {
    const next = handleSetChoice(setId, pending);
    router.replace(next === "quiz" ? "/practice/quiz" : "/practice/writing");
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.note}>
        {lookalikes ? t("choose_set_note_look") : t("choose_set_note")}
      </Text>
      {GROUPS.map((group) => {
        const items = options.filter((opt) => opt.group === group.id);
        if (!items.length) return null;
        return (
          <View key={group.id} style={styles.group}>
            <Eyebrow>{t(group.titleKey)}</Eyebrow>
            <View>
              {items.map((opt) => (
                <RowItem
                  key={opt.id}
                  title={opt.label}
                  hint={opt.hint}
                  onPress={() => onPick(opt.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[7] },
  note: { fontFamily: fonts.body, color: colors.textMuted, marginBottom: space[5], fontSize: 15 },
  group: { gap: space[3], marginBottom: space[6] },
});
