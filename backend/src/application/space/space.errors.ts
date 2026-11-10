export class SpaceNotFoundError extends Error {}
export class SpaceMailDeliveryError extends Error {}
export class DuplicateSpaceSlugError extends Error {}

export class ParticipantNotFoundError extends Error {}
export class AlreadyParticipantError extends Error {}

export class LocationNotFoundError extends Error {}
export class LocationOwnershipError extends Error {}
export class LocationAlreadyExistsError extends Error {}
export class OutsideBoundaryError extends Error {}

export class InviteNotFoundError extends Error {}
export class InviteExpiredError extends Error {}
export class InviteAlreadyUsedError extends Error {}
export class InviteRevokedError extends Error {}
export class InviteStillPendingError extends Error {}
export class AccessRequestNotFoundError extends Error {}
export class InviteOwnershipError extends Error {}
export class InviteRateLimitError extends Error {}
export class InviteCapExceededError extends Error {}
export class RoleEscalationError extends Error {}
export class ConsentRequiredError extends Error {}

export class EventEndedError extends Error {}
