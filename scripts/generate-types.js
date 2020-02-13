#!/usr/bin/env node
const process = require("process");
const https = require("https");
const path = require("path");
const { compile } = require("json-schema-to-typescript");
const makeUrl = (ref = "master") =>
  `https://raw.githubusercontent.com/tree-sitter/tree-sitter/${ref}/cli/src/generate/grammar-schema.json`;

function get(url = makeUrl()) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        const { statusCode } = res;

        if (statusCode !== 200) {
          throw new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
        }

        res.setEncoding("utf8");
        let rawData = "";
        res.on("data", chunk => {
          rawData += chunk;
        });
        res.on("end", () => {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        });
      })
      .on("error", reject);
  });
}

function main(ref = "master") {
  const url = makeUrl(ref);
  get(url)
    .then(json => compile(json, "", { bannerComment: `// see ${url}` }))
    .then(ts => ts.replace(/\s+\[k: string\]: any;/g, ""))
    .then(console.log);
}

main("master");
