#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const changeCase = require("change-case");
const { isBinary } = require("./is-text-or-binary");
const { program } = require("commander");
const pkg = require("./package.json");

function execute(from, to, options, command) {
  console.log(options);
  // const from = options.from;

  if (options.onlyDotName) {
    if (!fs.existsSync(".name")) {
      process.exit();
    }
  }

  to = to || path.basename(process.cwd());

  if (!from || !to) {
    console.log({ from, to });
    console.error(
      "change-name <from> [to]\n Note: 'to' defaults to current dir"
    );
    process.exit(1);
  }

  if (from === to) {
    process.exit();
  }

  console.log(`renaming from "${from}" to "${to}" ...`);

  const tests = [
    "camelCase",
    "constantCase",
    "headerCase",
    "noCase",
    "paramCase",
    "pascalCase",
    "pathCase",
    "sentenceCase",
    "snakeCase",
    "capitalCase",
    "dotCase",
  ];

  function findAndReplace(str, term, replacement) {
    return str.split(term).join(replacement);
  }

  function findAndReplaceWithTest(str, test) {
    return findAndReplace(str, changeCase[test](from), changeCase[test](to));
  }

  function findAndReplaceAll(str) {
    for (const test of tests) {
      str = findAndReplaceWithTest(str, test);
    }
    return str;
  }

  function transform(str) {
    return findAndReplaceAll(str);
  }

  function recurse(folderpath, files) {
    files = files || [];
    const filenames = fs.readdirSync(folderpath);
    for (const filename of filenames) {
      if (filename === ".git" || filename === "node_modules") {
        // TODO options
        continue;
      }
      const filepath = path.join(folderpath, filename);
      const stats = fs.statSync(filepath);
      const isDirectory = stats.isDirectory();
      if (isDirectory) {
        recurse(filepath, files);
      }
      files.push({ path: filepath, isDirectory });
    }
    return files;
  }

  const files = recurse("./");

  for (const file of files) {
    const oldPath = path.normalize(file.path);

    const dirName = path.dirname(file.path);
    const fileName = path.basename(file.path);

    if (fileName === ".name") {
      fs.unlinkSync(file.path);
      continue;
    }

    const newPath = path.normalize(path.join(dirName, transform(fileName)));

    if (oldPath !== newPath) {
      fs.renameSync(oldPath, newPath);
    }
    if (!file.isDirectory && !isBinary(newPath)) {
      const content = fs.readFileSync(newPath).toString();
      const newContent = transform(content);
      fs.writeFileSync(newPath, newContent);
    }
  }
}

program
  .name(pkg.name)
  .description("CLI to change name identifier in a folder to anoher name")
  .version(pkg.version)
  .argument("<from>", "name to change")
  .argument("[to]", "name to change to")
  .option(
    "-a, --ask",
    "will ask the user provide a new name or confirm the default choice"
  )
  .option(
    "--only-dot-name",
    "this will prevent change-name to be called twice by checking the existance of the .name file"
  )
  .action(execute);

program.parse();
