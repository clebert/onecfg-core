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
    const barReplacer3 = jest.fn((content) => `${content}d`);
    const barReplacer4 = jest.fn((content) => `${content}e`);
    const barReplacer5 = jest.fn((content) => `${content}f`);
    const barReplacer6 = jest.fn((content) => `${content}g`);
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

    const barChange3: FileChange<string> = {
      path: `foo/bar`,
      predicate: barPredicate,
      replacer: barReplacer3,
    };

    const barChange4: FileChange<string> = {
      path: `foo/bar`,
      predicate: barPredicate,
      replacer: barReplacer4,
    };

    const barChange5: FileChange<string> = {
      path: `foo/bar`,
      predicate: barPredicate,
      replacer: barReplacer5,
    };

    const barChange6: FileChange<string> = {
      path: `foo/bar`,
      predicate: barPredicate,
      replacer: barReplacer6,
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
        barDefinition, // a
        bazChange,
        {...barChange5, options: {priority: 1}}, // f
        barChange2, // c
        {...barChange3, options: {}}, // d
        {...barChange1, options: {priority: -1}}, // b
        {...barChange4, options: {priority: 0}}, // e
        {...barChange6, options: {priority: 1}}, // g
        quxChange,
      ),
    ).toBe(`ABCDEFG`);

    expect(barPredicate.mock.calls).toEqual([
      [`a`],
      [`ab`],
      [`abc`],
      [`abcd`],
      [`abcde`],
      [`abcdef`],
      [`abcdefg`],
    ]);

    expect(barSerializer.mock.calls).toEqual([[`abcdefg`]]);
    expect(barReplacer1.mock.calls).toEqual([[`a`]]);
    expect(barReplacer2.mock.calls).toEqual([[`ab`]]);
    expect(barReplacer3.mock.calls).toEqual([[`abc`]]);
    expect(barReplacer4.mock.calls).toEqual([[`abcd`]]);
    expect(barReplacer5.mock.calls).toEqual([[`abcde`]]);
    expect(barReplacer6.mock.calls).toEqual([[`abcdef`]]);
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
