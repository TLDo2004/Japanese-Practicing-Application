import { StyleSheet, Text, View } from "react-native";
import type { RubyRun } from "@jpa/dictionary";
import { colors, fonts } from "../theme";

/** Native composition of shared RubyRun nodes (no HTML <ruby>). */
export function RubyText({ nodes, size = 28 }: { nodes: RubyRun; size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="text">
      {nodes.map((node, i) => {
        if (node.kind === "text") {
          return (
            <Text key={i} style={[styles.base, { fontSize: size }]}>
              {node.text}
            </Text>
          );
        }
        return (
          <View key={i} style={styles.ruby}>
            <Text style={styles.rt}>{node.rt}</Text>
            <Text style={[styles.base, { fontSize: size }]}>{node.base}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  ruby: {
    alignItems: "center",
    marginHorizontal: 1,
  },
  rt: {
    fontFamily: fonts.jp,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
  base: {
    fontFamily: fonts.jpBold,
    color: colors.text,
    lineHeight: 36,
  },
});
