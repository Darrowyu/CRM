import { UserRole } from '../types/index.js';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: UserRole;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UserResponse {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  created_at?: Date;
}

export const toUserResponse = (user: User): UserResponse => ({ // 转换为响应格式，排除密码
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
  avatar: user.avatar,
  created_at: user.created_at
});
