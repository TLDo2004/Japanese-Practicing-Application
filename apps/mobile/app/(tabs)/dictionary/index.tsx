import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { DictMode } from "@jpa/dictionary";
import { migrateDictMode, nextRecentSearches, t } from "@jpa/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "../../../src/components/AppButton";
import { RubyText } from "../../../src/components/RubyText";
import { Chip, Eyebrow, Muted } from "../../../src/components/ui";
import { usePlatform } from "../../../src/platform/PlatformContext";
import type { DictionaryView } from "../../../src/platform/dictionary";
import { colors, fonts, radius, space, touch } from "../../../src/theme";

const MODES: Array<{ id: DictMode; key: string }> = [
  { id: "dict-jp-en", key: "mode_dict_jp_en" },
  { id: "dict-jp-vi", key: "mode_dict_jp_vi" },
  { id: "tr-en-jp", key: "mode_tr_en_jp" },
  { id: "tr-jp-en", key: "mode_tr_jp_en" },
  { id: "tr-vi-jp", key: "mode_tr_vi_jp" },
  { id: "tr-jp-vi", key: "mode_tr_jp_vi" },
];

export default function DictionaryScreen() {
  const { store, save, dictionary, speech } = usePlatform();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<DictMode>(() => migrateDictMode(store.dictMode) as DictMode);
  const [status, setStatus] = useState("");
  const [view, setView] = useState<DictionaryView | null>(null);
  const [loading, setLoading] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const readJapanese = (text: string) => {
    if (!text) return;
    try {
      speech.speak(text);
    } catch {
      /* nonfatal */
    }
  };

  const runSearch = async (raw: string, nextMode: DictMode) => {
    const q = raw.trim();
    if (!q) {
      setStatus(t("dict_empty"));
      return;
    }
    save({
      dictMode: nextMode,
      dictRecent: nextRecentSearches(store.dictRecent, q),
      lastTab: "dict",
    });
    setLoading(true);
    setView(null);
    setStatus(t("searching"));
    try {
      const result = await dictionary.search(q, nextMode);
      setView(result);
      if (result.kind === "error") setStatus(t("search_failed"));
      else if (result.kind === "none") setStatus(result.note || t("no_matches"));
      else if (result.kind === "translation") setStatus(result.note || "");
      else {
        setStatus(result.note || (result.entries.length === 1
          ? t("results_one")
          : t("results_many", { n: result.entries.length })));
      }
    } catch {
      setView({ kind: "error", keyword: q, note: "search_failed" });
      setStatus(t("search_failed"));
    } finally {
      setLoading(false);
    }
  };

  const recent = store.dictRecent;
  const showRecent = !view && !loading && recent.length > 0;
  const modeLabel = t(MODES.find((m) => m.id === mode)?.key || "mode_dict_jp_en");

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[6] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("dict_placeholder")}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t("dict_placeholder")}
            style={styles.input}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void runSearch(query, mode)}
          />
          <AppButton
            label={t("search")}
            disabled={loading}
            onPress={() => void runSearch(query, mode)}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("dict_mode_label")}: ${modeLabel}`}
          onPress={() => setModeOpen((open) => !open)}
          style={({ pressed }) => [styles.modeSelect, pressed ? styles.pressed : null]}
        >
          <Text style={styles.modeSelectText} numberOfLines={1}>{modeLabel}</Text>
          <Text style={styles.modeChevron}>{modeOpen ? "▴" : "▾"}</Text>
        </Pressable>
        {modeOpen ? (
          <View style={styles.modeList}>
            {MODES.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === mode }}
                onPress={() => {
                  setMode(item.id);
                  save({ dictMode: item.id });
                  setModeOpen(false);
                }}
                style={({ pressed }) => [
                  styles.modeOption,
                  item.id === mode ? styles.modeOptionActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.modeOptionText}>{t(item.key)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        {showRecent ? (
          <View style={styles.recent}>
            <Eyebrow>{t("recent_searches")}</Eyebrow>
            <View style={styles.chips}>
              {recent.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  onPress={() => {
                    setQuery(item);
                    void runSearch(item, mode);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {!view && !loading && !recent.length ? <Muted>{t("dict_hint")}</Muted> : null}

        {view?.kind === "translation" ? (
          <View style={styles.entry}>
            <Text style={styles.jp}>{view.source}</Text>
            {view.japaneseReading && view.japaneseText === view.output ? (
              <Text style={styles.reading}>{view.japaneseReading}</Text>
            ) : null}
            <View style={styles.sense}>
              <Text style={styles.pos}>{t("dict_translated")}</Text>
              <Text style={styles.gloss}>{view.output}</Text>
            </View>
            {view.japaneseReading && view.japaneseText === view.source ? (
              <Text style={styles.reading}>{view.japaneseReading}</Text>
            ) : null}
            {view.romaji ? (
              <Text style={styles.romaji} testID="dict-romaji">
                {t("dict_romaji")} · {view.romaji}
              </Text>
            ) : null}
            {view.speakText ? (
              <AppButton
                label={t("dict_read")}
                variant="secondary"
                onPress={() => readJapanese(view.speakText)}
              />
            ) : null}
          </View>
        ) : null}

        {view?.kind === "none" ? (
          <View style={styles.entry}>
            <Text style={styles.jp}>{view.keyword}</Text>
            <Text style={styles.gloss}>{view.note || t("dict_none")}</Text>
          </View>
        ) : null}

        {view?.kind === "error" ? (
          <View style={styles.entry}>
            <Text style={styles.gloss}>{t("search_failed")}</Text>
            <Muted>{t("dict_offline_hint")}</Muted>
          </View>
        ) : null}

        {view?.kind === "entries"
          ? view.entries.map((entry, index) => (
            <View style={styles.entry} key={`${entry.word}-${index}`}>
              <RubyText nodes={entry.ruby} />
              {entry.reading ? <Text style={styles.reading}>{entry.reading}</Text> : null}
              {entry.romaji ? (
                <Text style={styles.romaji} testID="dict-romaji">
                  {t("dict_romaji")} · {entry.romaji}
                </Text>
              ) : null}
              {entry.senses.map((sense, senseIndex) => (
                <View style={styles.sense} key={senseIndex}>
                  <Text style={styles.pos}>{sense.pos}</Text>
                  <Text style={styles.gloss}>{sense.gloss}</Text>
                </View>
              ))}
              {entry.speakText ? (
                <AppButton
                  label={t("dict_read")}
                  variant="secondary"
                  onPress={() => readJapanese(entry.speakText)}
                />
              ) : null}
            </View>
          ))
          : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: space[4], gap: space[3] },
  searchRow: { flexDirection: "row", gap: space[2] },
  input: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space[4],
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  modeSelect: {
    minHeight: touch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.violetSurface,
  },
  modeSelectText: { flex: 1, fontFamily: fonts.bodyMed, fontSize: 14, color: colors.violetText },
  modeChevron: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginLeft: space[2] },
  modeList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  modeOption: { paddingVertical: space[3], paddingHorizontal: space[3] },
  modeOptionActive: { backgroundColor: colors.blueSurface },
  modeOptionText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  pressed: { backgroundColor: colors.surfaceSubtle },
  status: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14, minHeight: 20 },
  recent: { gap: space[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  entry: {
    paddingVertical: space[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: space[2],
  },
  jp: { fontFamily: fonts.jpMed, fontSize: 24, color: colors.text },
  reading: { fontFamily: fonts.jp, fontSize: 15, color: colors.textMuted },
  romaji: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.blueText },
  sense: { flexDirection: "row", gap: space[3], marginTop: space[1] },
  pos: {
    width: 78,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    textTransform: "uppercase",
    color: colors.textMuted,
    paddingTop: 3,
  },
  gloss: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
});
