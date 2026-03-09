/**
 * Create Admin User Script
 * Creates an admin user in Supabase PostgreSQL via Drizzle ORM
 *
 * Usage: npm run create-admin [email] [password] [name]
 * Example: npm run create-admin admin@example.com admin123 "Administrator"
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from '../db/drizzle.js'
import { users } from '../db/schema/users.js'
import { eq } from 'drizzle-orm'

async function createAdmin() {
  const email = process.argv[2] || 'admin@benxe.local'
  const password = process.argv[3] || 'admin123'
  const name = process.argv[4] || 'Administrator'

  if (!db) {
    console.error('❌ Database not initialized. Check DATABASE_URL in .env')
    process.exit(1)
  }

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      // Update existing user's password
      console.log(`User "${email}" already exists. Updating password...`)
      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email))

      console.log(`✅ Password updated for user "${email}"`)
    } else {
      // Create new admin user
      await db.insert(users).values({
        email,
        passwordHash,
        name,
        role: 'admin',
        isActive: true,
        emailVerified: true,
      })

      console.log(`✅ Admin user created successfully!`)
      console.log(`   Email: ${email}`)
      console.log(`   Name: ${name}`)
      console.log(`   Role: admin`)
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  }
}

createAdmin()
