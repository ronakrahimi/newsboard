import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  console.log('Connecting to database...');
  const feeds = await prisma.feed.findMany()
  console.log('Feeds:', feeds)
}
main()
  .catch(e => {
    console.error('Error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
