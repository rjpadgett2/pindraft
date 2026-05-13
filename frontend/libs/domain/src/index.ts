export const ROLES = {
  MILL_ADMIN: 'Mill Admin',
  MILL_OPERATOR: 'Mill Operator',
} as const;

export type Role = keyof typeof ROLES;

export const CUSTOMER_KINDS = {
  SHEPHERD: 'Shepherd',
  DESIGNER: 'Designer',
} as const;

export type CustomerKind = keyof typeof CUSTOMER_KINDS;
