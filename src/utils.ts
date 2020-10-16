const fs = require("fs");

export function readConfiguration(filename: string) {
    const rawdata = fs.readFileSync(filename);
    const configurationJSON: Configuration = JSON.parse(rawdata);
    return configurationJSON;
}