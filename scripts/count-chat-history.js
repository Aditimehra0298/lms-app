const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.lmsChatHistory
  .count()
  .then((c) => {
    console.log("chat_history rows", c);
    return p.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
