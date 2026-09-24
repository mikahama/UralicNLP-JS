// Browser shim for node:fs
export const readFileSync = () => {
  throw new Error('fs.readFileSync is not supported in browser environment');
};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const readdirSync = () => [];
export const statSync = () => ({ mtimeMs: 0 });
export const accessSync = () => {};
export const rmSync = () => {};
export const promises = {
  readFile: async () => {
    throw new Error('fs.promises.readFile is not supported in browser environment');
  },
  writeFile: async () => {
    throw new Error('fs.promises.writeFile is not supported in browser environment');
  },
};
export const constants = { W_OK: 2 };
export default {
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  accessSync,
  rmSync,
  promises,
  constants,
};
