/**
 * Global Permissions System
 * 
 * Provides centralized, maintainable permission checks for roles.
 * Supports role hierarchy: SUPERADMIN > ADMIN > USER
 * Easily extendable with new permissions and features.
 */

/**
 * User role enum (matches Prisma schema)
 * Kept locally to avoid importing Prisma client in client components
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

/**
 * Define what each permission key means
 * Add new permissions here as features grow
 */
export enum Permission {
  // Admin panel access
  ACCESS_ADMIN_PANEL = 'access_admin_panel',
  
  // User management
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  CHANGE_USER_ROLE = 'change_user_role',
  
  // Settings management
  MANAGE_SETTINGS = 'manage_settings',
  MANAGE_APPEARANCE = 'manage_appearance',
  MANAGE_SECURITY = 'manage_security',
  
  // Content moderation
  MODERATE_CONTENT = 'moderate_content',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  
  // System administration
  MANAGE_SYSTEM = 'manage_system',
  MANAGE_ROLES = 'manage_roles',
  PERFORM_SUPERADMIN_ACTIONS = 'perform_superadmin_actions',
}

/**
 * Role permission mapping
 * Defines which permissions each role has
 * Higher roles inherit lower role permissions + their own
 */
const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  [UserRole.USER]: new Set([
    // Users have no special permissions
  ]),
  [UserRole.ADMIN]: new Set([
    // Admin can access the admin panel and manage basic settings
    Permission.ACCESS_ADMIN_PANEL,
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_APPEARANCE,
    Permission.MODERATE_CONTENT,
    Permission.VIEW_AUDIT_LOGS,
  ]),
  [UserRole.SUPERADMIN]: new Set([
    // Superadmin has all permissions
    Permission.ACCESS_ADMIN_PANEL,
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.CHANGE_USER_ROLE,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_APPEARANCE,
    Permission.MANAGE_SECURITY,
    Permission.MODERATE_CONTENT,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_SYSTEM,
    Permission.MANAGE_ROLES,
    Permission.PERFORM_SUPERADMIN_ACTIONS,
  ]),
}

/**
 * Role hierarchy levels for comparisons
 * Higher number = more powerful role
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.ADMIN]: 10,
  [UserRole.SUPERADMIN]: 100,
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]
  return permissions.has(permission)
}

/**
 * Check if a user has any of the given permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

/**
 * Check if a user has all of the given permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

/**
 * Check if one role is equal to or higher than another
 * Useful for comparisons without needing specific permissions
 */
export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if a user can perform an action on another user
 * (e.g., edit, delete, change role)
 * 
 * Rules:
 * - Users cannot modify other users
 * - Admins cannot modify superadmins
 * - Superadmins can modify anyone (except preventing self-demotion edge cases)
 * - Admins can view all users
 */
export function canModifyUser(actorRole: UserRole, targetRole: UserRole, action: 'view' | 'edit' | 'delete' | 'change_role'): boolean {
  switch (action) {
    case 'view':
      // Admins and superadmins can view any user
      return isRoleAtLeast(actorRole, UserRole.ADMIN)
    
    case 'edit':
      // Can only edit users at equal or lower role level
      return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
    
    case 'delete':
      // Can only delete users at equal or lower role level
      return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
    
    case 'change_role':
      // Can only change role of users at lower level
      return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
    
    default:
      return false
  }
}

/**
 * Get all permissions for a role (for UI/permission displays)
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role])
}

/**
 * Check if a role is privileged (not a regular user)
 */
export function isPrivilegedRole(role: UserRole): boolean {
  return role !== UserRole.USER
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    [UserRole.USER]: 'User',
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.SUPERADMIN]: 'Super Administrator',
  }
  return names[role]
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    [UserRole.USER]: 'Regular user with basic features',
    [UserRole.ADMIN]: 'Administrator with access to admin panel and user management',
    [UserRole.SUPERADMIN]: 'Super administrator with full system access',
  }
  return descriptions[role]
}
