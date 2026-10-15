"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReportSeedMode = resolveReportSeedMode;
function resolveReportSeedMode(args, options) {
    if (args.includes("--show-production-target")) {
        if (!options.isProduction) {
            throw new Error("--show-production-target is only available in production");
        }
        return "show-production-target";
    }
    if (options.isProduction) {
        const confirmationPrefix = "--confirm-production-target=";
        const confirmation = args.find((arg) => arg.startsWith(confirmationPrefix))
            ?.slice(confirmationPrefix.length);
        if (!confirmation) {
            throw new Error("Refusing production writes. First run with --show-production-target, then confirm the exact displayed target.");
        }
        if (confirmation !== options.databaseTarget) {
            throw new Error("The production target confirmation does not match this database. No data was changed.");
        }
    }
    else if (!args.includes("--confirm-development")) {
        throw new Error("This command inserts synthetic bookings. Re-run with --confirm-development after verifying the target database.");
    }
    return args.includes("--dry-run") ? "dry-run" : "apply";
}
