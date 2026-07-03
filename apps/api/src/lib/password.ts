import bcrypt from "bcryptjs";

// Facteur de coût bcrypt : 12 (2^12 = 4096 itérations). Plus résistant au
// bruteforce qu'un facteur 10, pour un surcoût de calcul négligeable au login.
const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
