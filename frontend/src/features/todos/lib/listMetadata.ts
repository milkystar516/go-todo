import type {
  ListColumn,
  Todo,
  TodoRuleDetail,
} from "../../../api/types";

export interface TodoListMetadataItem {
  label: string;
  value: unknown;
}

function decodePointerToken(token: string) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function resolveJsonPointer(
  document: unknown,
  pointer: string,
): unknown {
  if (pointer === "") {
    return document;
  }

  if (!pointer.startsWith("/")) {
    return undefined;
  }

  let current = document;

  for (const rawToken of pointer.slice(1).split("/")) {
    const token = decodePointerToken(rawToken);

    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token)) {
        return undefined;
      }

      current = current[Number(token)];
      continue;
    }

    if (
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, token)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[token];
  }

  return current;
}

function resolveColumn(
  content: Todo["content"],
  column: ListColumn,
): TodoListMetadataItem | null {
  const value = resolveJsonPointer(content, column.pointer);

  if (value === undefined || value === null || value === "") {
    return null;
  }

  return {
    label: column.label,
    value,
  };
}

export function getTodoListMetadata(
  todo: Todo,
  rule?: TodoRuleDetail,
): TodoListMetadataItem[] {
  if (!rule) {
    return [];
  }

  return rule.list_columns.flatMap((column) => {
    const item = resolveColumn(todo.content, column);
    return item ? [item] : [];
  });
}
