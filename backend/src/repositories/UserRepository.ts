import bcrypt from 'bcrypt';
import { BaseRepository } from './BaseRepository.js';
import { User, CreateUserDTO } from '../models/User.js';
import { query } from '../db/connection.js';

const SALT_ROUNDS = 10;

export const validatePassword = (password: string): { valid: boolean; message?: string } => { // 密码强度验证
  if (password.length < 8) return { valid: false, message: '密码长度至少8位' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: '密码需包含大写字母' };
  if (!/[a-z]/.test(password)) return { valid: false, message: '密码需包含小写字母' };
  if (!/[0-9]/.test(password)) return { valid: false, message: '密码需包含数字' };
  return { valid: true };
};

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async createUser(data: CreateUserDTO): Promise<User> { // 创建用户，密码加密
    const validation = validatePassword(data.password);
    if (!validation.valid) throw new Error(validation.message);
    const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return this.create({ username: data.username, password_hash, name: data.name, role: data.role } as Partial<User>);
  }

  async findByUsername(username: string): Promise<User | null> { // 按用户名查找
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> { // 验证密码
    return bcrypt.compare(password, user.password_hash);
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> { // 更新密码
    const validation = validatePassword(newPassword);
    if (!validation.valid) throw new Error(validation.message);
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const userRepository = new UserRepository();
