type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  position?: unknown;
};

const TABLE_BREAK = /^<br\s*\/?\s*>$/iu;

/** Convert only a standalone line-break tag inside a GFM table cell. */
export function remarkTableBreaks() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (node.type === "tableCell" && node.children) {
        node.children = node.children.map((child) =>
          child.type === "html" && TABLE_BREAK.test(child.value || "")
            ? { type: "break", position: child.position }
            : child,
        );
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
