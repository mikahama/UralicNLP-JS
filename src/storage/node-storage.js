import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const currentDir =
  typeof __dirname !== 'undefined'
    ? __dirname
    : typeof process !== 'undefined' && process.cwd
    ? process.cwd()
    : '.';

/**
 * Node.js filesystem model storage following Python UralicNLP library logic.
 * Looks for models in package models directory and ~/.uralicnlp.
 */
export class NodeStorage {
  /**
   * @param {string[]} [customFolders=[]]
   */
  constructor(customFolders = []) {
    this.customFolders = [...customFolders];
    this.installedCache = new Set();
  }

  /**
   * Adds a custom search directory for models.
   * @param {string} folderPath
   */
  addBaseFolder(folderPath) {
    if (!this.customFolders.includes(folderPath)) {
      this.customFolders.unshift(folderPath);
    }
  }

  /**
   * Returns list of base directories checked for models.
   * @returns {string[]}
   */
  getBaseFolders() {
    const defaultPackageModels = path.resolve(currentDir, '..', '..', 'models');
    const userHomeModels = path.join(os.homedir(), '.uralicnlp');
    const folders = [...this.customFolders, defaultPackageModels, userHomeModels];

    // Check if python's uralicNLP is installed in common user locations and include if present
    const pyCandidate = path.join(
      os.homedir(),
      '.local/lib/python3.14/site-packages/uralicNLP/models'
    );
    if (fs.existsSync(pyCandidate) && !folders.includes(pyCandidate)) {
      folders.push(pyCandidate);
    }

    return folders;
  }

  /**
   * Finds the first writable base directory (creates ~/.uralicnlp if needed).
   * @returns {string}
   */
  getWritableFolder() {
    const folders = [
      ...this.customFolders,
      path.join(os.homedir(), '.uralicnlp'),
      path.resolve(currentDir, '..', '..', 'models'),
    ];

    for (const folder of folders) {
      try {
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }
        fs.accessSync(folder, fs.constants.W_OK);
        return folder;
      } catch {
        // try next folder
      }
    }

    // Fallback to os tmpdir
    const tmp = path.join(os.tmpdir(), '.uralicnlp');
    if (!fs.existsSync(tmp)) {
      fs.mkdirSync(tmp, { recursive: true });
    }
    return tmp;
  }

  /**
   * Finds the directory containing models for the given language.
   * Following Python UralicNLP logic: checks multiple folders, sorts by mtime if requested.
   * @param {string} language
   * @param {boolean} [safe=false]
   * @returns {string | null}
   */
  whereModels(language, safe = false) {
    const folders = this.getBaseFolders();
    let latestPath = null;
    let latestTime = 0;

    for (const baseFolder of folders) {
      const candidate = path.join(baseFolder, language);
      if (fs.existsSync(candidate)) {
        try {
          const files = fs.readdirSync(candidate);
          if (files.length === 0) continue;

          // Find newest file in directory
          let maxFileTime = 0;
          for (const f of files) {
            try {
              const stat = fs.statSync(path.join(candidate, f));
              if (stat.mtimeMs > maxFileTime) {
                maxFileTime = stat.mtimeMs;
              }
            } catch {}
          }

          if (latestPath === null || maxFileTime > latestTime) {
            latestPath = candidate;
            latestTime = maxFileTime;
          }
        } catch {}
      }
    }

    if (latestPath !== null) {
      return latestPath;
    }

    if (safe) {
      return null;
    }

    throw new Error(
      `Models for ${language} were not in ${folders.join(
        ' or '
      )}. Use download("${language}") to download models.`
    );
  }

  /**
   * Returns path to model file, or null if missing.
   * @param {string} language
   * @param {string} modelType
   * @returns {Promise<string | null>}
   */
  async getModel(language, modelType) {
    const dir = this.whereModels(language, true);
    if (!dir) return null;
    const filePath = path.join(dir, modelType);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }

  /**
   * Checks if a specific model exists.
   * @param {string} language
   * @param {string} modelType
   * @returns {Promise<boolean>}
   */
  async hasModel(language, modelType) {
    const p = await this.getModel(language, modelType);
    return p !== null;
  }

  /**
   * Saves model data to disk.
   * @param {string} language
   * @param {string} modelType
   * @param {Uint8Array | ArrayBuffer | Buffer} data
   * @returns {Promise<void>}
   */
  async saveModel(language, modelType, data) {
    const writableBase = this.getWritableFolder();
    const targetDir = path.join(writableBase, language);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, modelType);
    const buffer = Buffer.isBuffer(data)
      ? data
      : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    await fs.promises.writeFile(filePath, buffer);
    this.installedCache.add(language);
  }

  /**
   * Checks if language is installed.
   * @param {string} language
   * @returns {Promise<boolean>}
   */
  async isLanguageInstalled(language) {
    if (this.installedCache.has(language)) {
      return true;
    }
    const dir = this.whereModels(language, true);
    if (dir !== null) {
      this.installedCache.add(language);
      return true;
    }
    return false;
  }

  /**
   * Loads metadata JSON.
   * @param {string} language
   * @returns {Promise<any | null>}
   */
  async getMetadata(language) {
    const dir = this.whereModels(language, true);
    if (!dir) return null;
    const metaPath = path.join(dir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const text = await fs.promises.readFile(metaPath, 'utf-8');
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Saves metadata JSON.
   * @param {string} language
   * @param {any} metadata
   * @returns {Promise<void>}
   */
  async saveMetadata(language, metadata) {
    const writableBase = this.getWritableFolder();
    const targetDir = path.join(writableBase, language);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, 'metadata.json');
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
  }

  /**
   * Uninstalls language models by removing the language directory.
   * @param {string} language
   * @returns {Promise<void>}
   */
  async uninstall(language) {
    let dir = this.whereModels(language, true);
    while (dir !== null) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
      dir = this.whereModels(language, true);
    }
    this.installedCache.delete(language);
  }

  /**
   * Lists all installed languages across base folders.
   * @returns {Promise<string[]>}
   */
  async listInstalledLanguages() {
    const folders = this.getBaseFolders();
    const langs = new Set();
    for (const base of folders) {
      if (fs.existsSync(base)) {
        try {
          const entries = fs.readdirSync(base, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              langs.add(entry.name);
            }
          }
        } catch {}
      }
    }
    return Array.from(langs);
  }
}
