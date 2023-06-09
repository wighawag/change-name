#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const changeCase = require('change-case');
const { isBinary } = require('istextorbinary');

const args = process.argv.slice(2);

let toIndex = 1;
let from = args[0];
if (from === "--only-dot-name") {
  from = args[1];
  toIndex ++;
  if (!fs.existsSync(".name")) {
    process.exit();
  } 
}

const to = args[toIndex] || path.basename(process.cwd());

if (!from || !to) {
  console.error("change-name <from> [<to>]\n Note: 'to' defaults to current dir");
  process.exit(1);
}

if (from === to) {
  process.exit();
}

console.log(`renaming from "${from}" to "${to}" ...`);

const tests = [
  'camelCase',
  'constantCase',
  'headerCase',
  'noCase',
  'paramCase',
  'pascalCase',
  'pathCase',
  'sentenceCase',
  'snakeCase',
  'capitalCase',
  'dotCase',
];


function findAndReplace(str, term, replacement) {
  return str.split(term).join(replacement);
}

function findAndReplaceWithTest(str, test) {
  return findAndReplace(
    str,
    changeCase[test](from),
    changeCase[test](to)
  );
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
    if (filename === ".git" || filename === "node_modules") { // TODO options
      continue;
    }
    const filepath = path.join(folderpath, filename);
    const stats = fs.statSync(filepath);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
      recurse(filepath, files);
    }
    files.push({path: filepath, isDirectory});
  }
  return files;
}

const files = recurse('./');

for (const file of files) {
  const oldPath = path.normalize(file.path);

  const dirName = path.dirname(file.path);
  const fileName = path.basename(file.path);

  if (fileName === '.name') {
    fs.unlinkSync(file.path);
    continue;
  }

  const newPath = path.normalize(path.join(dirName,transform(fileName)));

  if (oldPath !== newPath) {
    fs.renameSync(oldPath, newPath);
  }
  if (!file.isDirectory && !isBinary(newPath)) {
    const content = fs.readFileSync(newPath).toString();
    const newContent = transform(content);
    fs.writeFileSync(newPath, newContent);
  }
}
