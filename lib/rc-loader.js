'use babel';
import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';
import chokidar from 'chokidar';
import p from 'pify';

function resolvePath(val, projectPath) {
  if (val.match('https?://')) {
    return val;
  }
  return path.resolve(projectPath, val);
}

function parseImported(importedHash, projectPath) {
  if (!importedHash) {
    return null;
  }
  const newImportedHash = {};

  Object.keys(importedHash).forEach(key => {
    const imported = importedHash[key];
    if (!imported || !imported.PATH) {
      return;
    }
    let importedPath = imported.PATH;

    if (!/^\/$/.test(importedPath)) {
      importedPath = resolvePath(importedPath, projectPath);
    }

    newImportedHash[key] = {
      PATH: importedPath,
    };
  });

  return newImportedHash;
}

export default class RcLoader {
  constructor(atom) {
    const projectPaths = atom.project.getPaths();
    if (projectPaths.length === 0) {
      console.error('There are no projects in this window.');
      return;
    }
    if (projectPaths.length > 1) {
      console.log('There are more than 1 project in this window. \nglsl-livecoder only recognizes the 1st project.');
    }
    this.projectPath = projectPaths[0];
  }

  watch(cb) {
    this.watcher = chokidar.watch(path.resolve(this.projectPath, '.liverc'), {
      disableGlobbing: true,
    });
    this.watcher.on('add', () => this.load().then(cb));
    this.watcher.on('change', () => this.load().then(cb));
  }

  load() {
    const filepath = path.resolve(this.projectPath, '.liverc');
    let rc = null;

    return p(fs.readFile)(filepath, 'utf8')
      .then(json => {
        rc = JSON5.parse(json);
        rc.projectPath = this.projectPath;
        rc.IMPORTED = parseImported(rc.IMPORTED, rc.projectPath);
      })
      .catch(() => {
        console.log('Failed to parse rc file:', filepath);
      })
      .then(() => rc || {});
  }
}
