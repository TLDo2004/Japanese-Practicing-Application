import type { RubyRun } from "@jpa/dictionary";

export function RubyText({ nodes }: { nodes: RubyRun }) {
  return (
    <>
      {nodes.map((node, index) => (
        node.kind === "text" ? (
          <span key={index}>{node.text}</span>
        ) : (
          <ruby key={index}>
            {node.base}
            <rt>{node.rt}</rt>
          </ruby>
        )
      ))}
    </>
  );
}
