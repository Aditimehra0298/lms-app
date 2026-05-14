/* PostCSS expects `require('nanoid/non-secure')` → `{ nanoid, customAlphabet }`.
 * Vendored from nanoid@3.3.11/non-secure/index.cjs when node_modules is incomplete. */
"use strict";

// Same urlAlphabet as upstream nanoid 3.x (non-secure build).
let urlAlphabet =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

let customAlphabet = (alphabet, defaultSize = 21) => {
  return (size = defaultSize) => {
    let id = "";
    let i = size | 0;
    while (i--) {
      id += alphabet[(Math.random() * alphabet.length) | 0];
    }
    return id;
  };
};

let nanoid = (size = 21) => {
  let id = "";
  let i = size | 0;
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
};

module.exports = { nanoid, customAlphabet };
