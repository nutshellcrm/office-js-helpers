// Credit to Basarat/typescript-collections
// https://github.com/basarat/typescript-collections/blob/release/minify-umd.js

"use strict;"

var fs = require("fs");
var UglifyJS = require("uglify-js");
var distInFile = "./dist/office.helpers.js";
var distOutFileUnversioned = "./dist/office.helpers.min.js";

var result = UglifyJS.minify(distInFile, { mangle: true });
fs.writeFileSync(distOutFileUnversioned, result.code, { encoding: "utf-8" });