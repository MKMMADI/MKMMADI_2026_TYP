CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "participantAId" INTEGER NOT NULL,
    "participantBId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Conversation_participants_ordered_check" CHECK ("participantAId" < "participantBId")
);

CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_participantAId_participantBId_key"
    ON "Conversation"("participantAId", "participantBId");
CREATE INDEX "Conversation_participantAId_updatedAt_idx"
    ON "Conversation"("participantAId", "updatedAt");
CREATE INDEX "Conversation_participantBId_updatedAt_idx"
    ON "Conversation"("participantBId", "updatedAt");
CREATE INDEX "Message_conversationId_createdAt_idx"
    ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_recipientId_readAt_createdAt_idx"
    ON "Message"("recipientId", "readAt", "createdAt");

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_participantAId_fkey"
    FOREIGN KEY ("participantAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_participantBId_fkey"
    FOREIGN KEY ("participantBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message"
    ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message"
    ADD CONSTRAINT "Message_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;