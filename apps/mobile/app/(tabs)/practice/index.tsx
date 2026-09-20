import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@jpa/core";
import { ContinueCard, Display, Muted, RowItem, Section } from "../../../src/components/ui";
import { continueDetail, showPracticeContinue } from "../../../src/lib/continue";
import { setLabel } from "../../../src/lib/sets";
import { usePlatform } from "../../../src/platform/PlatformContext";
import { useSession } from "../../../src/session/SessionContext";
import { space } from "../../../src/theme";

/**
 * Script choice is deliberately three options. "One at a time" and
 * "Look-alikes" are different practice shapes, not scripts, so they sit in
 * their own group instead of inflating the script selector.
 */
const SCRIPTS = [
  { mode: "both", glyph: "あア", titleKey: "script_both" },
  { mode: "hira", glyph: "あ", titleKey: "hiragana" },
  { mode: "kata", glyph: "ア", titleKey: "katakana" },
] as const;

const SPECIALS = [
  { mode: "random", glyph: "随", titleKey: "special_one_at_a_time", hintKey: "special_one_at_a_time_hint" },
  { mode: "lookalikes", glyph: "似", titleKey: "special_lookalikes", hintKey: "special_lookalikes_hint" },
] as const;

export default function PracticeScreen() {
  const { store, save } = usePlatform();
  const { continueLast } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const showContinue = showPracticeContinue(store.lastSession);
  const copy = store.lastSession ? continueDetail(store.lastSession, setLabel) : null;

  const openSets = (kind: "write" | "quiz", mode: string) => {
    save({ lastTab: "practice" });
    router.push({ pathname: "/practice/sets", params: { kind, mode } });
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[6] }]}>
      {showContinue && copy ? (
        <View style={styles.block}>
          <ContinueCard
            title={t("continue_title")}
            detail={t("continue_detail", { title: copy.title, n: copy.seen, total: copy.total })}
            action={t("continue_resume")}
            onPress={() => {
              const kind = continueLast("practice");
              if (kind === "quiz") router.push("/practice/quiz");
              else if (kind === "write") router.push("/practice/writing");
            }}
          />
        </View>
      ) : null}

      <View style={styles.block}>
        <Display>{t("practice_question")}</Display>
      </View>

      <Section title={t("mode_writing")}>
        <Muted>{t("mode_writing_hint")}</Muted>
        <View>
          {SCRIPTS.map((item) => (
            <RowItem
              key={`write-${item.mode}`}
              mark={item.glyph}
              title={t(item.titleKey)}
              hint={t(item.mode === "both" ? "script_both_hint_write" : `script_${item.mode}_hint_write`)}
              onPress={() => openSets("write", item.mode)}
            />
          ))}
        </View>
      </Section>

      <Section title={t("mode_reading")}>
        <Muted>{t("mode_reading_hint")}</Muted>
        <View>
          {SCRIPTS.map((item) => (
            <RowItem
              key={`quiz-${item.mode}`}
              mark={item.glyph}
              title={t(item.titleKey)}
              hint={t(item.mode === "both" ? "script_both_hint_read" : `script_${item.mode}_hint_read`)}
              onPress={() => openSets("quiz", item.mode)}
            />
          ))}
        </View>
      </Section>

      <Section title={t("section_special")}>
        <View>
          {SPECIALS.map((item) => (
            <RowItem
              key={item.mode}
              mark={item.glyph}
              title={t(item.titleKey)}
              hint={t(item.hintKey)}
              onPress={() => openSets("write", item.mode)}
            />
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4] },
  block: { gap: space[3], marginBottom: space[6] },
});
