import pool from '../config/database';
import bcrypt from 'bcrypt';

type SeedGroup = { name: string; description?: string };
type SeedUser = {
  email: string;
  fullName: string;
  phone?: string;
  role: 'admin' | 'circle_treasurer' | 'group_treasurer' | 'member';
  groupNames?: string[];
  forceGroupTreasurer?: boolean;
};

const groups: SeedGroup[] = [
  { name: 'קבוצה א' },
  { name: 'קבוצה ב' },
  { name: 'קבוצה ג' },
];

// Example users – replace with your own before running in production. pf
const users: SeedUser[] = [
  { email: 'admin@example.com', fullName: 'Admin User', role: 'admin' },
  { email: 'circle@example.com', fullName: 'Circle Treasurer', role: 'circle_treasurer', groupNames: ['קבוצה א'], forceGroupTreasurer: true },
  { email: 'group.treasurer@example.com', fullName: 'Group Treasurer', role: 'group_treasurer', groupNames: ['קבוצה ב'] },
  { email: 'member1@example.com', fullName: 'Member One', role: 'member', groupNames: ['קבוצה א'] },
  { email: 'member2@example.com', fullName: 'Member Two', role: 'member', groupNames: ['קבוצה ב'] },
  { email: 'member3@example.com', fullName: 'Member Three', role: 'member', groupNames: ['קבוצה ג'] },
];

function roleFlags(user: SeedUser) {
  const role = user.role;
  return {
    isCircleTreasurer: role === 'circle_treasurer' || role === 'admin',
    isGroupTreasurer: role === 'group_treasurer' || user.forceGroupTreasurer === true,
  };
}

export async function runInitialSeed(options?: { closePool?: boolean; skipFlagCheck?: boolean }) {
  const closePool = options?.closePool !== false; // default true
  const skipFlagCheck = options?.skipFlagCheck === true;

  if (!skipFlagCheck && process.env.SEED !== 'TRUE') {
    console.log('SEED flag is not TRUE, skipping seed.');
    if (closePool) await pool.end();
    return;
  }

  const defaultPassword = process.env.DEFAULT_PASSWORD;
  if (!defaultPassword) {
    throw new Error('DEFAULT_PASSWORD is required');
  }

  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const groupNameToId: Record<string, number> = {};
    for (const group of groups) {
      const existing = await client.query('SELECT id FROM groups WHERE name = $1', [group.name]);
      let groupId: number;

      if (existing.rows.length > 0) {
        groupId = existing.rows[0].id;
        await client.query('UPDATE groups SET description = $2 WHERE id = $1', [groupId, group.description || null]);
      } else {
        const created = await client.query(
          'INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id',
          [group.name, group.description || null]
        );
        groupId = created.rows[0].id;
      }

      groupNameToId[group.name] = groupId;
    }

    for (const user of users) {
      const { isCircleTreasurer, isGroupTreasurer } = roleFlags(user);
      const result = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, is_circle_treasurer, is_group_treasurer)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             is_circle_treasurer = EXCLUDED.is_circle_treasurer,
             is_group_treasurer = EXCLUDED.is_group_treasurer,
             password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [user.email, hashedPassword, user.fullName, user.phone || null, isCircleTreasurer, isGroupTreasurer]
      );

      const userId = result.rows[0].id;
      for (const groupName of user.groupNames || []) {
        const groupId = groupNameToId[groupName];
        if (!groupId) {
          throw new Error(`Group "${groupName}" not found for user ${user.email}`);
        }

        await client.query(
          'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, groupId]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    if (closePool) await pool.end();
  }
}

if (require.main === module) {
  runInitialSeed()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}


