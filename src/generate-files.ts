import {posix} from 'path';

export interface FileGeneratorConfig<TDefinition extends FileDefinition<any>> {
  readonly definitions?: readonly TDefinition[];
  readonly contentChanges?: readonly FileContentChange<any, TDefinition>[];
}

export interface FileDefinition<TContentValue> {
  readonly path: string;
  readonly content?: FileContent<TContentValue>;
}

export interface FileContent<TValue> {
  readonly initialValue: TValue;
  readonly predicate: Predicate<TValue>;
  readonly serializer: Serializer<TValue>;
}

export type Predicate<TValue> = (value: unknown) => value is TValue;
export type Serializer<TValue> = (value: TValue) => string;

export interface FileContentChange<
  TValue,
  TOtherDefinition extends FileDefinition<unknown>,
> {
  readonly path: string;
  readonly predicate: Predicate<TValue>;
  readonly reducer: FileContentReducer<TValue, TOtherDefinition>;
}

export type FileContentReducer<
  TValue,
  TOtherDefinition extends FileDefinition<unknown>,
> = (args: FileContentReducerArgs<TValue, TOtherDefinition>) => TValue;

export interface FileContentReducerArgs<
  TValue,
  TOtherDefinition extends FileDefinition<unknown>,
> {
  readonly previousValue: TValue;
  readonly otherDefinitions: readonly TOtherDefinition[];
}

export interface GeneratedFile {
  readonly path: string;
  readonly data: string;
}

export function generateFiles<TDefinition extends FileDefinition<any>>(
  config: FileGeneratorConfig<TDefinition>,
): readonly GeneratedFile[] {
  const definitionsByPath: Record<string, TDefinition> = {};
  const {definitions = [], contentChanges = []} = config;

  for (const {path} of [...definitions, ...contentChanges]) {
    if (posix.isAbsolute(path)) {
      throw new Error(`The specified file path "${path}" must be relative.`);
    }

    if (path !== posix.normalize(path)) {
      throw new Error(`The specified file path "${path}" must be normalized.`);
    }
  }

  for (const definition of definitions) {
    const {path} = definition;

    if (definitionsByPath[path]) {
      throw new Error(
        `A file with the path "${path}" is defined more than once.`,
      );
    }

    definitionsByPath[path] = definition;
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
