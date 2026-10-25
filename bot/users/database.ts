import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

export interface UserRecord {
  userId: string;
  authToken?: string;
  linkedAt: string;
  status: "PENDING" | "ACTIVE" | "DISABLED";
}

const DATA_DIR = "./data";
const USERS_FILE = join(DATA_DIR, "users.json");

export async function initDatabase(): Promise<void> {
  try {
    await Deno.mkdir(DATA_DIR, { recursive: true });
    try {
      await Deno.stat(USERS_FILE);
    } catch {
      await Deno.writeTextFile(USERS_FILE, JSON.stringify({}, null, 2));
    }
  } catch (err) {
    console.error("[DB_INIT_ERROR]", err);
  }
}

export async function getAllUsers(): Promise<Record<string, UserRecord>> {
  try {
    await initDatabase();
    const text = await Deno.readTextFile(USERS_FILE);
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function getUser(userId: string): Promise<UserRecord | null> {
  const users = await getAllUsers();
  return users[userId] || null;
}

export async function saveUser(user: UserRecord): Promise<void> {
  const users = await getAllUsers();
  users[user.userId] = user;
  await Deno.writeTextFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function deleteUser(userId: string): Promise<boolean> {
  const users = await getAllUsers();
  if (users[userId]) {
    delete users[userId];
    await Deno.writeTextFile(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  }
  return false;
}