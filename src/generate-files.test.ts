import {generateFiles} from './generate-files';
import type {FileContent, FileDefinition, Predicate} from '.';

interface TestFileDefinition<TContentValue>
  extends FileDefinition<TContentValue> {
  readonly test: true;
}

function truthy(_value: unknown): _value is string {
  return true;
}

function falsy(_value: unknown): _value is string {
  return false;
}

function createContent(
  initialValue: string,
  predicate: Predicate<string>,
): FileContent<string> {
  return {initialValue, predicate, serializer: (value) => value.toLowerCase()};
}

describe(`generateFiles()`, () => {
  test(`an empty config`, () => {
    expect(generateFiles({})).toEqual([]);
  });

  test(`no file content changes`, () => {
    expect(
      generateFiles({
        definitions: [
          {path: `a`, content: createContent(`A0`, truthy)},
          {path: `b`},
        ],
      }),
    ).toEqual([{path: `a`, data: `a0`}]);
  });

  test(`multiple file content changes in sequence`, () => {
    const reducerA1 = jest.fn(() => `A1`);
    const reducerA2 = jest.fn(() => `A2`);
    const reducerB1 = jest.fn(() => `B1`);
    const reducerB2 = jest.fn(() => `B2`);
    const reducerC1 = jest.fn(() => `C1`);
    const reducerC2 = jest.fn(() => `C2`);

    const definitionA: TestFileDefinition<string> = {
      test: true,
      path: `a`,
      content: createContent(`A0`, truthy),
    };

    const definitionB: TestFileDefinition<string> = {
      test: true,
      path: `b`,
      content: createContent(`B0`, truthy),
    };

    const definitionC: TestFileDefinition<string> = {
      test: true,
      path: `c`,
      content: createContent(`C0`, truthy),
    };

    expect(
      generateFiles({
        definitions: [definitionA, definitionB, definitionC],
        contentChanges: [
          {path: `a`, predicate: truthy, reducer: reducerA1},
          {path: `b`, predicate: truthy, reducer: reducerB1},
          {path: `c`, predicate: truthy, reducer: reducerC1},
          {path: `a`, predicate: truthy, reducer: reducerA2},
          {path: `b`, predicate: truthy, reducer: reducerB2},
          {path: `c`, predicate: truthy, reducer: reducerC2},
        ],
      }),
    ).toEqual([
      {path: `a`, data: `a2`},
      {path: `b`, data: `b2`},
      {path: `c`, data: `c2`},
    ]);

    expect(reducerA1.mock.calls).toEqual([
      [{previousValue: `A0`, otherDefinitions: [definitionB, definitionC]}],
    ]);

    expect(reducerA2.mock.calls).toEqual([
      [{previousValue: `A1`, otherDefinitions: [definitionB, definitionC]}],
    ]);

    expect(reducerB1.mock.calls).toEqual([
      [{previousValue: `B0`, otherDefinitions: [definitionA, definitionC]}],
    ]);

    expect(reducerB2.mock.calls).toEqual([
      [{previousValue: `B1`, otherDefinitions: [definitionA, definitionC]}],
    ]);

    expect(reducerC1.mock.calls).toEqual([
      [{previousValue: `C0`, otherDefinitions: [definitionA, definitionB]}],
    ]);

    expect(reducerC2.mock.calls).toEqual([
      [{previousValue: `C1`, otherDefinitions: [definitionA, definitionB]}],
    ]);
  });

  test(`changing undefined file content has no effect`, () => {
    const reducer = jest.fn();

    expect(
      generateFiles({
        definitions: [{path: `a`}],
        contentChanges: [
          {path: `a`, predicate: truthy, reducer},
          {path: `b`, predicate: truthy, reducer},
        ],
      }),
    ).toEqual([]);

    expect(reducer).toBeCalledTimes(0);
  });

  test(`changing incompatible file content causes an error`, () => {
    const reducer = jest.fn();

    expect(() =>
      generateFiles({
        definitions: [{path: `a`, content: createContent(`A0`, truthy)}],
        contentChanges: [{path: `a`, predicate: falsy, reducer}],
      }),
    ).toThrow(
      new Error(`Unable to change the incompatible content of file "a".`),
    );

    expect(reducer).toBeCalledTimes(0);
  });

  test(`serializing malformed file content causes an error`, () => {
    expect(() =>
      generateFiles({
        definitions: [{path: `a`, content: createContent(`A0`, falsy)}],
      }),
    ).toThrow(
      new Error(`Unable to serialize the malformed content of file "a".`),
    );
  });

  test(`specifying an absolute file path causes an error`, () => {
    expect(() => generateFiles({definitions: [{path: `/a`}]})).toThrow(
      new Error(`The specified file path "/a" must be relative.`),
    );

    expect(() =>
      generateFiles({
        contentChanges: [{path: `/a`, predicate: truthy, reducer: jest.fn()}],
      }),
    ).toThrow(new Error(`The specified file path "/a" must be relative.`));
  });

  test(`specifying a non-normalized file path causes an error`, () => {
    expect(() => generateFiles({definitions: [{path: `./a`}]})).toThrow(
      new Error(`The specified file path "./a" must be normalized.`),
    );

    expect(() => generateFiles({definitions: [{path: `a/../b`}]})).toThrow(
      new Error(`The specified file path "a/../b" must be normalized.`),
    );

    expect(() =>
      generateFiles({
        contentChanges: [{path: `./a`, predicate: truthy, reducer: jest.fn()}],
      }),
    ).toThrow(new Error(`The specified file path "./a" must be normalized.`));
  });

  test(`defining a file with the same path more than once causes an error`, () => {
    expect(() =>
      generateFiles({definitions: [{path: `a`}, {path: `a`}]}),
    ).toThrow(new Error(`A file with path "a" is defined more than once.`));

    expect(() =>
      generateFiles({
        definitions: [{path: `../a`}, {path: `../a`}],
      }),
    ).toThrow(new Error(`A file with path "../a" is defined more than once.`));
  });
});
