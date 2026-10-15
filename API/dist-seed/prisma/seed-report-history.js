"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_fs_1 = require("node:fs");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const report_history_seed_safety_1 = require("./report-history-seed-safety");
const report_history_data_1 = require("./report-history-data");
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
    throw new Error("DATABASE_URL must be set");
const databaseUrl = new URL(connectionString);
const isProduction = process.env.NODE_ENV === "production";
const databaseTarget = `${databaseUrl.host}${databaseUrl.pathname}`;
const mode = (0, report_history_seed_safety_1.resolveReportSeedMode)(process.argv.slice(2), { isProduction, databaseTarget });
if (mode === "show-production-target") {
    console.log(`Production database target: ${databaseTarget}`);
    process.exit(0);
}
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (!isProduction &&
    !localHosts.has(databaseUrl.hostname) &&
    process.env.REPORT_SEED_ALLOW_REMOTE_DEV !== "true") {
    throw new Error(`Refusing non-local database host "${databaseUrl.hostname}". Set REPORT_SEED_ALLOW_REMOTE_DEV=true only after verifying this is a development database.`);
}
let poolConnectionString = connectionString;
if (isProduction) {
    databaseUrl.searchParams.delete("sslmode");
    databaseUrl.searchParams.delete("sslrootcert");
    poolConnectionString = databaseUrl.toString();
}
const pool = new pg_1.Pool({
    connectionString: poolConnectionString,
    ...(isProduction
        ? {
            ssl: {
                ca: (0, node_fs_1.readFileSync)("/app/certs/rds-global-bundle.pem", "utf8"),
                rejectUnauthorized: true,
            },
        }
        : {}),
});
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg(pool, { disposeExternalPool: true }),
});
async function main() {
    const [rooms, employees] = await Promise.all([
        prisma.room.findMany({
            where: { isActive: true, status: client_1.RoomStatus.AVAILABLE },
            select: { id: true, name: true },
        }),
        prisma.user.findMany({
            where: { Active: true, role: client_1.Role.EMPLOYEE },
            select: { id: true },
        }),
    ]);
    const candidates = (0, report_history_data_1.buildReportHistory)(rooms, employees);
    const oldestStartAt = new Date(Math.min(...candidates.map((booking) => booking.startAt.getTime())));
    const latestEndAt = new Date(Math.max(...candidates.map((booking) => booking.endAt.getTime())));
    const [existingBookings, existingDemoCount] = await Promise.all([
        prisma.booking.findMany({
            where: {
                NOT: { purpose: { startsWith: report_history_data_1.REPORT_HISTORY_MARKER } },
                status: { notIn: ["CANCELLED", "RESCHEDULE_REQUIRED"] },
                startAt: { lt: latestEndAt },
                endAt: { gt: oldestStartAt },
            },
            include: { rooms: { select: { roomId: true } } },
        }),
        prisma.booking.count({
            where: { purpose: { startsWith: report_history_data_1.REPORT_HISTORY_MARKER } },
        }),
    ]);
    const bookings = (0, report_history_data_1.withoutExistingRoomConflicts)(candidates, existingBookings);
    const roomIdByPurpose = new Map(bookings.map((booking) => [booking.purpose, booking.roomId]));
    if (mode === "dry-run") {
        console.log(`Report history dry run: would insert ${bookings.length} synthetic bookings across ` +
            `${report_history_data_1.REPORT_HISTORY_DAYS} days, skip ${candidates.length - bookings.length} conflicting sessions, ` +
            `and replace ${existingDemoCount} existing marked bookings. No data was changed.`);
        return;
    }
    const result = await prisma.$transaction(async (transaction) => {
        const removed = await transaction.booking.deleteMany({
            where: { purpose: { startsWith: report_history_data_1.REPORT_HISTORY_MARKER } },
        });
        await transaction.booking.createMany({
            data: bookings.map(({ roomId: _roomId, ...booking }) => booking),
        });
        const inserted = await transaction.booking.findMany({
            where: { purpose: { startsWith: report_history_data_1.REPORT_HISTORY_MARKER } },
            select: { id: true, purpose: true },
        });
        if (inserted.length !== bookings.length) {
            throw new Error(`Expected ${bookings.length} synthetic bookings, found ${inserted.length}`);
        }
        await transaction.bookingRoom.createMany({
            data: inserted.map((booking) => {
                const roomId = roomIdByPurpose.get(booking.purpose);
                if (roomId === undefined)
                    throw new Error("Could not match a synthetic booking to its room");
                return { bookingId: booking.id, roomId, roomStatus: "BOOKED" };
            }),
        });
        return { removed: removed.count, inserted: inserted.length };
    }, { timeout: 60000 });
    console.log(`Report history ready: ${result.inserted} synthetic bookings across ${report_history_data_1.REPORT_HISTORY_DAYS} days ` +
        `(${candidates.length - bookings.length} skipped to avoid conflicts). ` +
        `Replaced ${result.removed} records from this seeder; existing non-demo data was left unchanged.`);
}
main()
    .catch((error) => {
    console.error("Failed to seed synthetic report history:", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
