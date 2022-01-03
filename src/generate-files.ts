import {posix} from 'path';

export interface FileGeneratorConfig<TMetadata> {
  readonly definitions?: readonly FileDefinition<TMetadata, any>[];
  readonly contentChanges?: readonly FileContentChange<TMetadata, any>[];
}

export interface FileDefinition<TMetadata, TContentValue> {
  readonly path: string;
  readonly metadata: TMetadata;
  readonly content?: FileContent<TContentValue>;
}

export interface FileContent<TValue> {
  readonly initialValue: TValue;
  readonly predicate: Predicate<TValue>;
  readonly serializer: Serializer<TValue>;
}

export type Predicate<TValue> = (value: unknown) => value is TValue;
export type Serializer<TValue> = (value: TValue) => string;

export interface FileContentChange<TMetadata, TValue> {
  readonly path: string;
  readonly predicate: Predicate<TValue>;
  readonly reducer: FileContentReducer<TMetadata, TValue>;
}

export type FileContentReducer<TMetadata, TValue> = (
  args: FileContentReducerArgs<TMetadata, TValue>,
) => TValue;

export interface FileContentReducerArgs<TMetadata, TValue> {
  readonly previousValue: TValue;
  readonly otherDefinitions: readonly ShallowFileDefinition<TMetadata>[];
}

export type ShallowFileDefinition<TMetadata> = Omit<
  FileDefinition<TMetadata, unknown>,
  'content'
>;

export interface GeneratedFile {
  readonly path: string;
  readonly data: string;
}

export function generateFiles<TMetadata>(
  config: FileGeneratorConfig<TMetadata>,
): readonly GeneratedFile[] {
  const definitionsByPath: Record<
    string,
    Omit<FileDefinition<TMetadata, unknown>, 'content'>
  > = {};

  const {definitions = [], contentChanges = []} = config;

  for (const {path} of [...definitions, ...contentChanges]) {
    if (posix.isAbsolute(path)) {
      throw new Error(`The specified file path "${path}" must be relative.`);
    }

    if (path !== posix.normalize(path)) {
      throw new Error(`The specified file path "${path}" must be normalized.`);
    }
  }

  for (const {path, metadata} of definitions) {
    if (definitionsByPath[path]) {
      throw new Error(
        `A file with the path "${path}" is defined more than once.`,
      );
    }

    definitionsByPath[path] = {path, metadata};
  }

  const generatedFiles: GeneratedFile[] = [];

  for (const {path, content} of definitions) {
    if (!content) {
      continue;
    }

    const {[path]: _, ...otherDefinitionsByPath} = definitionsByPath;
    const otherDefinitions = Object.values(otherDefinitionsByPath);

    let value = content.initialValue;

    for (const contentChange of contentChanges) {
      if (path === contentChange.path) {
        if (!contentChange.predicate(value)) {
          throw new Error(
            `Unable to change the incompatible content of file "${path}".`,
          );
        }

        value = contentChange.reducer({previousValue: value, otherDefinitions});
      }
    }

    if (!content.predicate(value)) {
      throw new Error(
        `Unable to serialize the malformed content of file "${path}".`,
      );
    }

    generatedFiles.push({path, data: content.serializer(value)});
  }

  return generatedFiles;
}
