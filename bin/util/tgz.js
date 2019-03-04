"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const fstream_1 = require("fstream");
const tar_1 = require("tar");
const zlib = require("zlib");
const io_1 = require("./io");
function gzip(input) {
    return input.pipe(zlib.createGzip());
}
exports.gzip = gzip;
function unGzip(input) {
    const output = zlib.createGunzip();
    input.pipe(output);
    return output;
}
exports.unGzip = unGzip;
function writeTgz(inputDirectory, outFileName) {
    return new Promise((resolve, reject) => {
        resolve(io_1.streamDone(createTgz(inputDirectory, reject).pipe(fs_1.createWriteStream(outFileName))));
    });
}
exports.writeTgz = writeTgz;
// To output this for testing: Export it and:
// `require("./bin/lib/npm-client").createTgz("./output/foo", err => { throw err }).pipe(fs.createWriteStream("foo.tgz"))`
function createTgz(dir, onError) {
    return gzip(createTar(dir, onError));
}
exports.createTgz = createTgz;
function createTar(dir, onError) {
    const packer = tar_1.Pack({ noProprietary: true })
        .on("error", onError);
    return fstream_1.Reader({ path: dir, type: "Directory", filter: addDirectoryExecutablePermission })
        .on("error", onError)
        .pipe(packer);
}
/**
 * Work around a bug where directories bundled on Windows do not have executable permission when extracted on Linux.
 * https://github.com/npm/node-tar/issues/7#issuecomment-17572926
 */
function addDirectoryExecutablePermission(entry) {
    if (entry.props.type === "Directory") {
        entry.props.mode = addExecutePermissionsFromReadPermissions(entry.props.mode);
    }
    return true;
}
function addExecutePermissionsFromReadPermissions(mode) {
    // Constant that gives execute permissions to owner, group, and others. "+x"
    const allExecutePermissions = 0o111;
    // Moves the bits for read permissions into the place for execute permissions.
    // In other words, a component will have execute permissions if it has read permissions.
    const readPermissionsAsExecutePermissions = (mode >>> 2) & allExecutePermissions; // tslint:disable-line no-bitwise
    // Add these additional execute permissions to the mode.
    return mode | readPermissionsAsExecutePermissions; // tslint:disable-line no-bitwise
}
//# sourceMappingURL=tgz.js.map