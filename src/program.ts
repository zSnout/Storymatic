import { randomUUID } from "crypto";
import { Flags, makeCompilerOptions, transpile } from ".";
import ts = require("typescript");

export function program(node: ts.SourceFile, flags: Partial<Flags> = {}) {
  let code = transpile(node, flags);

  let uuid = randomUUID();

  let host = ts.createCompilerHost(makeCompilerOptions(flags));
  let [fileExists, getSourceFile, getSourceFileByPath, readFile, writeFile] = [
    host.fileExists.bind(host),
    host.getSourceFile.bind(host),
    host.getSourceFileByPath?.bind(host),
    host.readFile.bind(host),
    host.writeFile.bind(host),
  ];

  host.fileExists = (fileName) => fileName == uuid || fileExists(fileName);
  host.getSourceFile = (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile
  ) =>
    fileName == uuid
      ? node
      : getSourceFile(
          fileName,
          languageVersion,
          onError,
          shouldCreateNewSourceFile
        );
  host.getSourceFileByPath = (
    fileName,
    path,
    languageVersion,
    onError,
    shouldCreateNewSourceFile
  ) =>
    fileName == uuid
      ? node
      : getSourceFileByPath?.(
          fileName,
          path,
          languageVersion,
          onError,
          shouldCreateNewSourceFile
        );
  host.readFile = (fileName: string) =>
    fileName == uuid ? code : readFile(fileName);
  host.writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) =>
    fileName == uuid
      ? undefined
      : writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);

  return ts.createProgram([uuid], makeCompilerOptions(flags), host);
}
