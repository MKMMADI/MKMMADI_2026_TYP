/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Verifies database behavior for report history seed safety.
 */

import { resolveReportSeedMode } from "../../prisma/report-history-seed-safety";

const databaseTarget = "example.cluster.af-south-1.rds.amazonaws.com:5432/bookspace";

describe("resolveReportSeedMode", () => {
  it("shows the production target without requiring a write confirmation", () => {
    expect(resolveReportSeedMode(["--show-production-target"], {
      isProduction: true,
      databaseTarget,
    })).toBe("show-production-target");
  });

  it("requires an exact production target confirmation", () => {
    expect(() => resolveReportSeedMode([], {
      isProduction: true,
      databaseTarget,
    })).toThrow("Refusing production writes");
    expect(() => resolveReportSeedMode([
      "--confirm-production-target=another-db/bookspace",
    ], {
      isProduction: true,
      databaseTarget,
    })).toThrow("does not match this database");
  });

  it("supports a confirmed production dry run and apply", () => {
    const confirmation = `--confirm-production-target=${databaseTarget}`;
    expect(resolveReportSeedMode([confirmation, "--dry-run"], {
      isProduction: true,
      databaseTarget,
    })).toBe("dry-run");
    expect(resolveReportSeedMode([confirmation], {
      isProduction: true,
      databaseTarget,
    })).toBe("apply");
  });

  it("continues to require the development confirmation outside production", () => {
    expect(() => resolveReportSeedMode([], {
      isProduction: false,
      databaseTarget,
    })).toThrow("Re-run with --confirm-development");
    expect(resolveReportSeedMode(["--confirm-development", "--dry-run"], {
      isProduction: false,
      databaseTarget,
    })).toBe("dry-run");
  });

  it("does not expose the production target option outside production", () => {
    expect(() => resolveReportSeedMode(["--show-production-target"], {
      isProduction: false,
      databaseTarget,
    })).toThrow("only available in production");
  });
});
