"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_HISTORY_DAYS = exports.REPORT_HISTORY_MARKER = void 0;
exports.buildReportHistory = buildReportHistory;
exports.withoutExistingRoomConflicts = withoutExistingRoomConflicts;
const client_1 = require("@prisma/client");
exports.REPORT_HISTORY_MARKER = "[BOOKSPACE REPORT DEMO V1]";
exports.REPORT_HISTORY_DAYS = 180;
const PURPOSES = [
    "Weekly project planning",
    "Cross-functional delivery review",
    "Client discovery workshop",
    "Quarterly goals check-in",
    "Team learning session",
    "Product roadmap discussion",
    "Operations improvement meeting",
    "Design critique and review",
    "Budget planning session",
    "Research findings presentation",
    "Hiring panel interviews",
    "Customer onboarding workshop",
];
function stableRatio(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
}
function buildReportHistory(rooms, employees, now = new Date()) {
    if (rooms.length === 0 || employees.length === 0) {
        throw new Error("At least one available room and one active employee are required");
    }
    const orderedRooms = [...rooms].sort((left, right) => left.id - right.id);
    const orderedEmployees = [...employees].sort((left, right) => left.id - right.id);
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const firstDay = today - exports.REPORT_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    const bookings = [];
    for (let dayOffset = 0; dayOffset < exports.REPORT_HISTORY_DAYS; dayOffset += 1) {
        const day = new Date(firstDay + dayOffset * 24 * 60 * 60 * 1000);
        const weekday = day.getUTCDay();
        if (weekday === 0 || weekday === 6)
            continue;
        const dateKey = day.toISOString().slice(0, 10);
        const progress = dayOffset / (exports.REPORT_HISTORY_DAYS - 1);
        orderedRooms.forEach((room, roomIndex) => {
            const roomPopularity = (orderedRooms.length - roomIndex) / orderedRooms.length;
            const primaryProbability = 0.64 + progress * 0.21 + roomPopularity * 0.08;
            const secondaryProbability = 0.08 + progress * 0.12 + roomPopularity * 0.08;
            const primaryKey = `${dateKey}:${room.id}:primary`;
            const sessions = stableRatio(primaryKey) < primaryProbability
                ? 1 + Number(stableRatio(`${primaryKey}:second`) < secondaryProbability)
                : 0;
            for (let session = 0; session < sessions; session += 1) {
                const sessionKey = `${dateKey}:${room.id}:${session}`;
                const employeeIndex = Math.floor(stableRatio(`${sessionKey}:employee`) * orderedEmployees.length);
                const purposeIndex = Math.floor(stableRatio(`${sessionKey}:purpose`) * PURPOSES.length);
                const durationMinutes = 60 + Math.floor(stableRatio(`${sessionKey}:duration`) * 3) * 30;
                const hour = 8 + session * 3;
                const startAt = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour - 2));
                const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
                const statusSample = stableRatio(`${sessionKey}:status`);
                const status = statusSample < 0.08
                    ? client_1.BookingStatus.CANCELLED
                    : statusSample < 0.11
                        ? client_1.BookingStatus.RESCHEDULE_REQUIRED
                        : client_1.BookingStatus.COMPLETED;
                bookings.push({
                    employeeId: orderedEmployees[employeeIndex].id,
                    purpose: `${exports.REPORT_HISTORY_MARKER} ${dateKey} | room ${room.id} | session ${session + 1} | ${room.name}: ${PURPOSES[purposeIndex]}`,
                    status,
                    startAt,
                    endAt,
                    roomId: room.id,
                });
            }
        });
    }
    return bookings;
}
function withoutExistingRoomConflicts(candidates, existingBookings) {
    const existingByRoom = new Map();
    for (const booking of existingBookings) {
        for (const { roomId } of booking.rooms) {
            const roomBookings = existingByRoom.get(roomId) ?? [];
            roomBookings.push(booking);
            existingByRoom.set(roomId, roomBookings);
        }
    }
    return candidates.filter((candidate) => !(existingByRoom.get(candidate.roomId) ?? []).some((existing) => candidate.startAt < existing.endAt && candidate.endAt > existing.startAt));
}
