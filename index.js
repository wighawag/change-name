#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const changeCase = require("change-case");
const { isBinary } = require("./is-text-or-binary");
const { program } = require("commander");
const pkg = require("./package.json");
const prompts = require("prompts");

const nameRegex = /^[0-9a-z\-_]+$/i;

function rename(from, to, options) {
  let count = 0;
  const countOnly = options.countOnly;

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
    const splits = str.split(term);
    count += splits.length - 1;
    return splits.join(replacement);
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
      continue;
    }

    let newPath = path.normalize(path.join(dirName, transform(fileName)));

    if (oldPath !== newPath) {
      if (!countOnly) {
        fs.renameSync(oldPath, newPath);
      } else {
        newPath = oldPath;
      }
    }
    if (!file.isDirectory && !isBinary(newPath)) {
      const content = fs.readFileSync(newPath).toString();
      const newContent = transform(content);
      if (!countOnly) {
        fs.writeFileSync(newPath, newContent);
      }
    }
  }

  return count;
}

async function execute(from, to, options, command) {
  if (!options.unsafe) {
    if (!fs.existsSync(".name")) {
      process.exit();
    }
  }

  to = to || path.basename(process.cwd());

  if (options.ask) {
    const response = await prompts({
      type: "text",
      name: "to",
      message: "Please specify the new name",
      validate: (v) => {
        const result = nameRegex.exec(v);
        if (result && result[0] === v) {
          return true;
        } else {
          return `invalid name, please only use [0-9a-z\\-_]`;
        }
      },
      initial: to,
    });

    to = response.to;
  }

  if (!from || !to) {
    console.error(
      "change-name <from> [to]\n Note: 'to' defaults to current dir"
    );
    process.exit(1);
  }

  if (from === to) {
    process.exit();
  }

  console.log(`renaming from "${from}" to "${to}" ...`);

  const before = rename(from, to, options);
  const after = rename(to, from, { ...options, countOnly: true });
  let deleteDotName = options.onlyOnce;
  if (after !== before) {
    console.log(before, after);
    if (after < before) {
      console.log(
        `cannot change name from now on as there is less changes that will result from a name changes.`
      );
    } else {
      console.log(
        `cannot change name from now on as there is more changes that will result from a name changes`
      );
    }
    deleteDotName = true;
  }

  if (deleteDotName) {
    if (fs.existsSync(".name")) {
      fs.unlinkSync(".name");
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
    "--unsafe",
    "this will not check the existance of the .name file and will change the name in all circumstances"
  )
  .option(
    "--only-once",
    "this will delete the .name file in every case, even if no issue found"
  )
  .action(execute);

program.parse();
