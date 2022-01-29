export interface FileDeclaration<TContent> {
  readonly path: string;
  readonly predicate: Predicate<TContent>;
}

export type Predicate<TContent> = (content: unknown) => content is TContent;

export interface FileDefinition<TContent> extends FileDeclaration<TContent> {
  readonly content: TContent;
  readonly serializer: Serializer<TContent>;
}

export type Serializer<TContent> = (content: TContent) => string;

export interface FileChange<TContent> extends FileDeclaration<TContent> {
  readonly replacer: Replacer<TContent>;
  readonly options?: FileChangeOptions;
}

export type Replacer<TContent> = (previousContent: TContent) => TContent;

export interface FileChangeOptions {
  readonly priority?: -1 | 0 | 1;
}

export function generateContent(
  fileDefinition: FileDefinition<any>,
  ...fileChanges: readonly FileChange<any>[]
): string {
  let {content} = fileDefinition;

  check(fileDefinition.path);

  for (const fileChange of fileChanges) {
    check(fileChange.path);
  }

  fileChanges = fileChanges
    .filter((fileChange) => fileChange.path === fileDefinition.path)
    .sort((a, b) => (a.options?.priority ?? 0) - (b.options?.priority ?? 0));

  for (const fileChange of fileChanges) {
    if (!fileChange.predicate(content)) {
      throw new Error(
        `incompatible file content to replace: ${fileDefinition.path}`,
      );
    }

    content = fileChange.replacer(content);
  }

  if (!fileDefinition.predicate(content)) {
    throw new Error(
      `incompatible file content to serialize: ${fileDefinition.path}`,
    );
  }

  return fileDefinition.serializer(content);
}

function check(path: string): void {
  if (path.startsWith(`/`)) {
    throw new Error(`file path must be relative: ${path}`);
  }

  for (const segment of path.split(`/`)) {
    if (segment === `.` || segment === `..`) {
      throw new Error(`file path must be normalized: ${path}`);
    }
  }
}
