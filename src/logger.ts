// tslint:disable: no-any
import * as util from "util"

export class Logger {
    static verbose = true

    static log(format: any, ...args: any[]) {
        if (this.verbose) {
            console.log(util.format(format, ...args))
        }
    }

    static warn(format: any, ...args: any[]) {
        console.warn(util.format(format, ...args))
    }
}
