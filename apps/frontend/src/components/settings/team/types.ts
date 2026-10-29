import type { MemberStatus, UserRole } from '@quarry/shared/types';

export interface TeamMember {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	status: MemberStatus;
}
