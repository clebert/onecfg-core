import {generateContent} from './generate-content';
import type {FileChange, FileDefinition, Predicate} from './generate-content';

type PredicateMock = Predicate<string> & jest.Mock;

describe(`generateContent()`, () => {
  test(`no change in file content`, () => {
    const barPredicate = jest.fn(() => true) as PredicateMock;
    const barSerializer = jest.fn((content: string) => content.toUpperCase());
    const bazPredicate = jest.fn() as PredicateMock;
    const bazReplacer = jest.fn();
    const quxPredicate = jest.fn() as PredicateMock;
    const quxReplacer = jest.fn();

    const barDefinition1: FileDefinition<string> = {
      path: `foo/bar`,
      content: `a`,
      predicate: barPredicate,
      serializer: barSerializer,
    };

    expect(generateContent(barDefinition1)).toBe(`A`);

    const barDefinition2: FileDefinition<string> = {
      ...barDefinition1,
      content: `b`,
    };

    const bazChange: FileChange<string> = {
      path: `foo/baz`,
      predicate: bazPredicate,
      replacer: bazReplacer,
    };

    const quxChange: FileChange<string> = {
      path: `foo/qux`,
      predicate: quxPredicate,
      replacer: quxReplacer,
    };

    expect(generateContent(barDefinition2, bazChange, quxChange)).toBe(`B`);
    expect(barPredicate.mock.calls).toEqual([[`a`], [`b`]]);
    expect(barSerializer.mock.calls).toEqual([[`a`], [`b`]]);
    expect(bazPredicate.mock.calls).toEqual([]);
    expect(bazReplacer.mock.calls).toEqual([]);
    expect(quxPredicate.mock.calls).toEqual([]);
    expect(quxReplacer.mock.calls).toEqual([]);
  });

  test(`multiple changes in file content`, () => {
    const barPredicate = jest.fn(() => true) as PredicateMock;
    const barSerializer = jest.fn((content: string) => content.toUpperCase());
    const barReplacer1 = jest.fn((content) => `${content}b`);
    const barReplacer2 = jest.fn((content) => `${content}c`);
    const bazPredicate = jest.fn() as PredicateMock;
    const bazReplacer = jest.fn();
    const quxPredicate = jest.fn() as PredicateMock;
    const quxReplacer = jest.fn();

    const barDefinition: FileDefinition<string> = {
      path: `foo/bar`,
      content: `a`,
      predicate: barPredicate,
      serializer: barSerializer,
    };

    const barChange1: FileChange<string> = {
      path: `foo/bar`,
      predicate: barPredicate,
      replacer: barReplacer1,
    };

    const barChange2: FileChange<string> = {
      path: `foo/bar`,
      predicate: barPredicate,
      replacer: barReplacer2,
    };

    const bazChange: FileChange<string> = {
      path: `foo/baz`,
      predicate: bazPredicate,
      replacer: bazReplacer,
    };

    const quxChange: FileChange<string> = {
      path: `foo/qux`,
      predicate: quxPredicate,
      replacer: quxReplacer,
    };

    expect(
      generateContent(
        barDefinition,
        bazChange,
        barChange1,
        barChange2,
        quxChange,
      ),
    ).toBe(`ABC`);

    expect(barPredicate.mock.calls).toEqual([[`a`], [`ab`], [`abc`]]);
    expect(barSerializer.mock.calls).toEqual([[`abc`]]);
    expect(barReplacer1.mock.calls).toEqual([[`a`]]);
    expect(barReplacer2.mock.calls).toEqual([[`ab`]]);
    expect(bazPredicate.mock.calls).toEqual([]);
    expect(bazReplacer.mock.calls).toEqual([]);
    expect(quxPredicate.mock.calls).toEqual([]);
    expect(quxReplacer.mock.calls).toEqual([]);
  });

  test(`incompatible file content to replace`, () => {
    const predicate1 = jest.fn() as PredicateMock;
    const predicate2 = jest.fn(() => false) as PredicateMock;
    const serializer = jest.fn();
    const replacer = jest.fn();

    expect(() =>
      generateContent(
        {path: `foo/bar`, content: `a`, predicate: predicate1, serializer},
        {path: `foo/bar`, predicate: predicate2, replacer},
      ),
    ).toThrow(new Error(`incompatible file content to replace: foo/bar`));

    expect(predicate1.mock.calls).toEqual([]);
    expect(serializer.mock.calls).toEqual([]);
    expect(predicate2.mock.calls).toEqual([[`a`]]);
    expect(replacer.mock.calls).toEqual([]);
  });

  test(`incompatible file content to serialize`, () => {
    const predicate1 = jest.fn(() => false) as PredicateMock;
    const predicate2 = jest.fn(() => true) as PredicateMock;
    const serializer = jest.fn();
    const replacer = jest.fn((content) => `${content}b`);

    expect(() =>
      generateContent(
        {path: `foo/bar`, content: `a`, predicate: predicate1, serializer},
        {path: `foo/bar`, predicate: predicate2, replacer},
      ),
    ).toThrow(new Error(`incompatible file content to serialize: foo/bar`));

    expect(predicate1.mock.calls).toEqual([[`ab`]]);
    expect(serializer.mock.calls).toEqual([]);
    expect(predicate2.mock.calls).toEqual([[`a`]]);
    expect(replacer.mock.calls).toEqual([[`a`]]);
  });

  test(`file path must be relative`, () => {
    const predicate = jest.fn() as PredicateMock;
    const serializer = jest.fn();
    const replacer = jest.fn();

    expect(() =>
      generateContent({path: `/foo/bar`, content: `a`, predicate, serializer}),
    ).toThrow(new Error(`file path must be relative: /foo/bar`));

    expect(() =>
      generateContent(
        {path: `foo/bar`, content: `a`, predicate, serializer},
        {path: `foo/baz`, predicate, replacer},
        {path: `/foo/qux`, predicate, replacer},
      ),
    ).toThrow(new Error(`file path must be relative: /foo/qux`));

    expect(predicate.mock.calls).toEqual([]);
    expect(serializer.mock.calls).toEqual([]);
    expect(replacer.mock.calls).toEqual([]);
  });

  test(`file path must be normalized`, () => {
    const predicate = jest.fn() as PredicateMock;
    const serializer = jest.fn();
    const replacer = jest.fn();

    expect(() =>
      generateContent({path: `./foo/bar`, content: `a`, predicate, serializer}),
    ).toThrow(new Error(`file path must be normalized: ./foo/bar`));

    expect(() =>
      generateContent({path: `foo/./bar`, content: `a`, predicate, serializer}),
    ).toThrow(new Error(`file path must be normalized: foo/./bar`));

    expect(() =>
      generateContent({
        path: `../foo/bar`,
        content: `a`,
        predicate,
        serializer,
      }),
    ).toThrow(new Error(`file path must be normalized: ../foo/bar`));

    expect(() =>
      generateContent({
        path: `foo/../bar`,
        content: `a`,
        predicate,
        serializer,
      }),
    ).toThrow(new Error(`file path must be normalized: foo/../bar`));

    expect(() =>
      generateContent(
        {path: `foo/bar`, content: `a`, predicate, serializer},
        {path: `foo/baz`, predicate, replacer},
        {path: `./foo/qux`, predicate, replacer},
      ),
    ).toThrow(new Error(`file path must be normalized: ./foo/qux`));

    expect(() =>
      generateContent(
        {path: `foo/bar`, content: `a`, predicate, serializer},
        {path: `foo/baz`, predicate, replacer},
        {path: `foo/./qux`, predicate, replacer},
      ),
    ).toThrow(new Error(`file path must be normalized: foo/./qux`));

    expect(() =>
      generateContent(
        {path: `foo/bar`, content: `a`, predicate, serializer},
        {path: `foo/baz`, predicate, replacer},
        {path: `../foo/qux`, predicate, replacer},
      ),
    ).toThrow(new Error(`file path must be normalized: ../foo/qux`));

    expect(() =>
      generateContent(
        {path: `foo/bar`, content: `a`, predicate, serializer},
        {path: `foo/baz`, predicate, replacer},
        {path: `foo/../qux`, predicate, replacer},
      ),
    ).toThrow(new Error(`file path must be normalized: foo/../qux`));

    expect(predicate.mock.calls).toEqual([]);
    expect(serializer.mock.calls).toEqual([]);
    expect(replacer.mock.calls).toEqual([]);
  });
});
