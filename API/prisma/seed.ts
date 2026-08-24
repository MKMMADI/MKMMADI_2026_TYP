/**
 * BookSpace – realistic seed data for development / demos.
 * Run from API folder: npx prisma db seed
 * (or: npx ts-node prisma/seed.ts)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, RoomStatus, BookingStatus } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Password123!"; // shared demo password for all seed users

function daysFromNow(days: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hoursLater(start: Date, hours: number) {
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  console.log("Clearing existing data…");

  // Order respects FK constraints
  await prisma.stockAdjustment.deleteMany();
  await prisma.consumableItem.deleteMany();
  await prisma.bookingAmenity.deleteMany();
  await prisma.bookingRoom.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.roomAmenity.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.room.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Users ───────────────────────────────────────────────
  console.log("Seeding users…");

  const manager = await prisma.user.create({
    data: {
      name: "Lerato Mokoena",
      email: "lerato.mokoena@bookspace.co.za",
      passwordHash,
      role: Role.MANAGER,
      department: "Facilities & Operations",
      contactNumber: "+27 82 441 2093",
      Active: true,
    },
  });

  const clerk1 = await prisma.user.create({
    data: {
      name: "Sipho Dlamini",
      email: "sipho.dlamini@bookspace.co.za",
      passwordHash,
      role: Role.CLERK,
      department: "Facilities & Operations",
      contactNumber: "+27 71 883 1140",
      Active: true,
    },
  });

  const clerk2 = await prisma.user.create({
    data: {
      name: "Ayesha Patel",
      email: "ayesha.patel@bookspace.co.za",
      passwordHash,
      role: Role.CLERK,
      department: "Facilities & Operations",
      contactNumber: "+27 83 220 5519",
      Active: true,
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: "Thandi Mokoena",
        email: "thandi.mokoena@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "Strategy",
        contactNumber: "+27 82 100 3344",
        Active: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Noluthando Khumalo",
        email: "noluthando.khumalo@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "Product Design",
        contactNumber: "+27 73 556 8890",
        Active: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Michael Roberts",
        email: "michael.roberts@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "Client Success",
        contactNumber: "+27 84 912 0031",
        Active: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sarah Chen",
        email: "sarah.chen@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "Engineering",
        contactNumber: "+27 79 334 2210",
        Active: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Johan van der Berg",
        email: "johan.vanderberg@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "Finance",
        contactNumber: "+27 82 667 4412",
        Active: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Fatima Hassan",
        email: "fatima.hassan@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "People & Culture",
        contactNumber: "+27 71 228 9055",
        Active: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Kagiso Molefe",
        email: "kagiso.molefe@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "Marketing",
        contactNumber: "+27 83 441 7788",
        Active: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Naidoo",
        email: "priya.naidoo@bookspace.co.za",
        passwordHash,
        role: Role.EMPLOYEE,
        department: "Legal",
        contactNumber: "+27 72 110 6633",
        Active: true,
      },
    }),
  ]);

  // ─── Amenities ───────────────────────────────────────────
  console.log("Seeding amenities…");

  const amenities = await Promise.all([
    prisma.amenity.create({
      data: {
        name: "4K Display",
        description: "65-inch 4K screen with HDMI and wireless casting",
        isActive: true,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Video conferencing",
        description: "Logitech Meetup camera + Teams/Zoom ready",
        isActive: true,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Whiteboard",
        description: "Wall-mounted magnetic whiteboard with markers",
        isActive: true,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Wi-Fi",
        description: "Dedicated high-speed guest Wi-Fi",
        isActive: true,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Speakerphone",
        description: "Conference speakerphone for hybrid calls",
        isActive: true,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Flip chart",
        description: "Mobile flip-chart stand",
        isActive: true,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Coffee station",
        description: "Nespresso machine and water station outside the room",
        isActive: true,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Accessible entrance",
        description: "Step-free access and adjustable table height",
        isActive: true,
      },
    }),
  ]);

  const [
    display,
    videoConf,
    whiteboard,
    wifi,
    speakerphone,
    flipChart,
    coffee,
    accessible,
  ] = amenities;

  // ─── Rooms ───────────────────────────────────────────────
  console.log("Seeding rooms…");

  const atlas = await prisma.room.create({
    data: {
      name: "Atlas Boardroom",
      description: "Main boardroom on level 3 — ideal for leadership and client meetings.",
      capacity: 12,
      status: RoomStatus.AVAILABLE,
      isActive: true,
      amenities: {
        create: [
          { amenityId: display.id },
          { amenityId: videoConf.id },
          { amenityId: whiteboard.id },
          { amenityId: wifi.id },
          { amenityId: speakerphone.id },
          { amenityId: coffee.id },
          { amenityId: accessible.id },
        ],
      },
    },
  });

  const studio2 = await prisma.room.create({
    data: {
      name: "Studio 2",
      description: "Design studio with writable walls — product and creative sessions.",
      capacity: 8,
      status: RoomStatus.AVAILABLE,
      isActive: true,
      amenities: {
        create: [
          { amenityId: display.id },
          { amenityId: whiteboard.id },
          { amenityId: wifi.id },
          { amenityId: flipChart.id },
        ],
      },
    },
  });

  const horizon = await prisma.room.create({
    data: {
      name: "Horizon Room",
      description: "Quiet mid-size room with city views — strategy and 1:1s.",
      capacity: 6,
      status: RoomStatus.AVAILABLE,
      isActive: true,
      amenities: {
        create: [
          { amenityId: display.id },
          { amenityId: videoConf.id },
          { amenityId: wifi.id },
          { amenityId: speakerphone.id },
        ],
      },
    },
  });

  const baobab = await prisma.room.create({
    data: {
      name: "Baobab",
      description: "Large training room for workshops and all-hands.",
      capacity: 24,
      status: RoomStatus.AVAILABLE,
      isActive: true,
      amenities: {
        create: [
          { amenityId: display.id },
          { amenityId: videoConf.id },
          { amenityId: whiteboard.id },
          { amenityId: wifi.id },
          { amenityId: flipChart.id },
          { amenityId: coffee.id },
          { amenityId: accessible.id },
        ],
      },
    },
  });

  const podA = await prisma.room.create({
    data: {
      name: "Focus Pod A",
      description: "Small focus booth for interviews and private calls.",
      capacity: 2,
      status: RoomStatus.AVAILABLE,
      isActive: true,
      amenities: {
        create: [{ amenityId: wifi.id }, { amenityId: speakerphone.id }],
      },
    },
  });

  const karoo = await prisma.room.create({
    data: {
      name: "Karoo Lounge",
      description: "Informal lounge space — currently under maintenance.",
      capacity: 10,
      status: RoomStatus.MAINTENANCE,
      isActive: true,
      amenities: {
        create: [{ amenityId: wifi.id }, { amenityId: coffee.id }],
      },
    },
  });

  const archiveRoom = await prisma.room.create({
    data: {
      name: "Old Library (archived)",
      description: "Decommissioned space — kept for historical bookings only.",
      capacity: 4,
      status: RoomStatus.OUT_OF_SERVICE,
      isActive: false,
      amenities: { create: [] },
    },
  });

  void archiveRoom; // seeded but unused in bookings

  // ─── Bookings ────────────────────────────────────────────
  console.log("Seeding bookings…");

  const [
    thandi,
    nolu,
    michael,
    sarah,
    johan,
    fatima,
    kagiso,
    priya,
  ] = employees;

  type BookingSeed = {
    employeeId: number;
    preparedById?: number;
    purpose: string;
    status: BookingStatus;
    startAt: Date;
    endAt: Date;
    roomIds: number[];
    amenityIds: number[];
  };

  const bookingSeeds: BookingSeed[] = [
    // Pending — manager can approve/reject these
    {
      employeeId: thandi.id,
      purpose: "Quarterly planning session with Strategy leads",
      status: BookingStatus.PENDING,
      startAt: daysFromNow(1, 9, 0),
      endAt: daysFromNow(1, 11, 0),
      roomIds: [atlas.id],
      amenityIds: [display.id, videoConf.id, whiteboard.id],
    },
    {
      employeeId: nolu.id,
      purpose: "Product design review — mobile app redesign",
      status: BookingStatus.PENDING,
      startAt: daysFromNow(1, 13, 0),
      endAt: daysFromNow(1, 14, 30),
      roomIds: [studio2.id],
      amenityIds: [display.id, whiteboard.id, flipChart.id],
    },
    {
      employeeId: michael.id,
      purpose: "Client strategy meeting — Acme Holdings",
      status: BookingStatus.PENDING,
      startAt: daysFromNow(2, 10, 0),
      endAt: daysFromNow(2, 11, 30),
      roomIds: [horizon.id],
      amenityIds: [display.id, videoConf.id, speakerphone.id],
    },
    {
      employeeId: fatima.id,
      purpose: "People & Culture policy workshop",
      status: BookingStatus.PENDING,
      startAt: daysFromNow(3, 9, 0),
      endAt: daysFromNow(3, 12, 0),
      roomIds: [baobab.id],
      amenityIds: [display.id, whiteboard.id, flipChart.id, coffee.id],
    },

    // Confirmed
    {
      employeeId: sarah.id,
      preparedById: clerk1.id,
      purpose: "Engineering sprint planning",
      status: BookingStatus.CONFIRMED,
      startAt: daysFromNow(0, 14, 0),
      endAt: daysFromNow(0, 15, 30),
      roomIds: [studio2.id],
      amenityIds: [display.id, whiteboard.id],
    },
    {
      employeeId: johan.id,
      preparedById: clerk2.id,
      purpose: "Month-end finance close review",
      status: BookingStatus.CONFIRMED,
      startAt: daysFromNow(1, 8, 30),
      endAt: daysFromNow(1, 10, 0),
      roomIds: [horizon.id],
      amenityIds: [display.id, wifi.id],
    },
    {
      employeeId: kagiso.id,
      preparedById: clerk1.id,
      purpose: "Campaign kick-off — Spring brand refresh",
      status: BookingStatus.CONFIRMED,
      startAt: daysFromNow(2, 9, 0),
      endAt: daysFromNow(2, 11, 0),
      roomIds: [atlas.id],
      amenityIds: [display.id, videoConf.id, coffee.id],
    },

    // Preparing
    {
      employeeId: priya.id,
      preparedById: clerk2.id,
      purpose: "Legal contract review with external counsel",
      status: BookingStatus.PREPARING,
      startAt: daysFromNow(0, 11, 0),
      endAt: daysFromNow(0, 12, 30),
      roomIds: [horizon.id],
      amenityIds: [display.id, speakerphone.id],
    },
    {
      employeeId: thandi.id,
      preparedById: clerk1.id,
      purpose: "Board pack dry-run",
      status: BookingStatus.PREPARING,
      startAt: daysFromNow(0, 15, 0),
      endAt: daysFromNow(0, 16, 30),
      roomIds: [atlas.id],
      amenityIds: [display.id, videoConf.id, coffee.id],
    },

    // Ready
    {
      employeeId: michael.id,
      preparedById: clerk2.id,
      purpose: "Customer onboarding walkthrough",
      status: BookingStatus.READY,
      startAt: daysFromNow(0, 9, 0),
      endAt: daysFromNow(0, 10, 0),
      roomIds: [podA.id],
      amenityIds: [wifi.id, speakerphone.id],
    },

    // Completed (yesterday / earlier this week)
    {
      employeeId: sarah.id,
      preparedById: clerk1.id,
      purpose: "Team standup & demos",
      status: BookingStatus.COMPLETED,
      startAt: daysFromNow(-1, 9, 0),
      endAt: daysFromNow(-1, 9, 45),
      roomIds: [studio2.id],
      amenityIds: [display.id],
    },
    {
      employeeId: fatima.id,
      preparedById: clerk2.id,
      purpose: "New joiner induction",
      status: BookingStatus.COMPLETED,
      startAt: daysFromNow(-2, 10, 0),
      endAt: daysFromNow(-2, 12, 0),
      roomIds: [baobab.id],
      amenityIds: [display.id, coffee.id, accessible.id],
    },
    {
      employeeId: johan.id,
      preparedById: clerk1.id,
      purpose: "Budget variance deep-dive",
      status: BookingStatus.COMPLETED,
      startAt: daysFromNow(-3, 14, 0),
      endAt: daysFromNow(-3, 15, 30),
      roomIds: [horizon.id],
      amenityIds: [display.id, whiteboard.id],
    },

    // Cancelled
    {
      employeeId: kagiso.id,
      purpose: "Press briefing (rescheduled by Comms)",
      status: BookingStatus.CANCELLED,
      startAt: daysFromNow(1, 16, 0),
      endAt: daysFromNow(1, 17, 0),
      roomIds: [atlas.id],
      amenityIds: [display.id, videoConf.id],
    },
    {
      employeeId: nolu.id,
      purpose: "Usability testing session",
      status: BookingStatus.CANCELLED,
      startAt: daysFromNow(-1, 13, 0),
      endAt: daysFromNow(-1, 15, 0),
      roomIds: [studio2.id],
      amenityIds: [display.id, whiteboard.id],
    },
  ];

  for (const seed of bookingSeeds) {
    await prisma.booking.create({
      data: {
        employeeId: seed.employeeId,
        preparedById: seed.preparedById,
        purpose: seed.purpose,
        status: seed.status,
        startAt: seed.startAt,
        endAt: seed.endAt,
        rooms: {
          create: seed.roomIds.map((roomId) => ({
            roomId,
            roomStatus: "BOOKED",
          })),
        },
        amenities: {
          create: seed.amenityIds.map((amenityId) => ({ amenityId })),
        },
      },
    });
  }

  // ─── Consumables + stock adjustments ─────────────────────
  console.log("Seeding consumables & stock adjustments…");

  const markers = await prisma.consumableItem.create({
    data: {
      name: "Whiteboard markers (assorted)",
      unit: "pack",
      quantityOnHand: 6,
      reorderLevel: 4,
    },
  });

  const paper = await prisma.consumableItem.create({
    data: {
      name: "A4 printer paper",
      unit: "ream",
      quantityOnHand: 18,
      reorderLevel: 8,
    },
  });

  const coffeePods = await prisma.consumableItem.create({
    data: {
      name: "Nespresso capsules",
      unit: "box",
      quantityOnHand: 3,
      reorderLevel: 5,
    },
  });

  const water = await prisma.consumableItem.create({
    data: {
      name: "Still water (500ml)",
      unit: "case",
      quantityOnHand: 12,
      reorderLevel: 6,
    },
  });

  const nameTags = await prisma.consumableItem.create({
    data: {
      name: "Visitor name badges",
      unit: "pack",
      quantityOnHand: 2,
      reorderLevel: 3,
    },
  });

  const sanitiser = await prisma.consumableItem.create({
    data: {
      name: "Hand sanitiser refill",
      unit: "litre",
      quantityOnHand: 8,
      reorderLevel: 4,
    },
  });

  await prisma.stockAdjustment.createMany({
    data: [
      {
        itemId: markers.id,
        adjustedById: clerk1.id,
        quantityChange: -2,
        reason: "Issued to Atlas Boardroom for quarterly planning",
      },
      {
        itemId: coffeePods.id,
        adjustedById: clerk2.id,
        quantityChange: -1,
        reason: "Restocked coffee station outside Baobab",
      },
      {
        itemId: paper.id,
        adjustedById: clerk1.id,
        quantityChange: 10,
        reason: "Delivery received from supplier — PO-2026-084",
      },
      {
        itemId: nameTags.id,
        adjustedById: clerk2.id,
        quantityChange: -1,
        reason: "Used for new joiner induction",
      },
      {
        itemId: water.id,
        adjustedById: clerk1.id,
        quantityChange: -2,
        reason: "Client meeting setup — Horizon Room",
      },
      {
        itemId: coffeePods.id,
        adjustedById: manager.id,
        quantityChange: 4,
        reason: "Emergency top-up after low-stock alert",
      },
      {
        itemId: sanitiser.id,
        adjustedById: clerk2.id,
        quantityChange: -1,
        reason: "Weekly refill of wall dispensers",
      },
    ],
  });

  console.log("\nSeed complete.\n");
  console.log("Demo logins (password for all):", PASSWORD);
  console.log("  Manager : lerato.mokoena@bookspace.co.za");
  console.log("  Clerk   : sipho.dlamini@bookspace.co.za");
  console.log("  Employee: thandi.mokoena@bookspace.co.za");
  console.log(`\nRooms: 7 | Amenities: ${amenities.length} | Employees: ${employees.length + 3}`);
  console.log(`Bookings: ${bookingSeeds.length} | Consumables: 6`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
