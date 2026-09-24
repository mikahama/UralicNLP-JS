export const join = (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
export const resolve = (...parts) => join(...parts);
export const dirname = (p) => p.substring(0, p.lastIndexOf('/')) || '.';
export default { join, resolve, dirname };
