import { communityRulesVersion } from '../models/community-rules';
export function hasAcceptedCommunityRules(userId: string) { return localStorage.getItem('homeEasyCommunityRules.' + userId) === communityRulesVersion; }
export function acceptCommunityRules(userId: string) { localStorage.setItem('homeEasyCommunityRules.' + userId, communityRulesVersion); }
