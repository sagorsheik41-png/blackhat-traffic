/**
 * Middleware: Subscription tier gating.
 * Usage: router.get('/tool', requireAuth, requireTier('pro'), controller)
 */

const TIER_LEVELS = {
    free: 0,
    pro: 1,
    ultimate: 2,
};

/**
 * Returns middleware that checks if user's tier meets the minimum required tier.
 * @param {string} minTier - Minimum tier required ('free', 'pro', 'ultimate')
 */
const requireTier = (minTier) => {
    return (req, res, next) => {
        if (!req.user) {
            if (req.accepts('html')) {
                return res.redirect('/auth/login');
            }
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userLevel = TIER_LEVELS[req.user.tier] ?? 0;
        const requiredLevel = TIER_LEVELS[minTier] ?? 0;

        // Strict block logic based on the feature required
        // 'ultimate' explicitly requires level 2
        // 'pro' requires level 1
        if (userLevel >= requiredLevel) {
            return next();
        }

        if (req.accepts('html')) {
            return res.status(403).render('errors/upgrade', {
                user: req.user,
                requiredTier: minTier,
                currentTier: req.user.tier,
            });
        }

        return res.status(403).json({
            error: 'Insufficient subscription tier',
            requiredTier: minTier,
            currentTier: req.user.tier,
            upgradeUrl: '/dashboard/upgrade',
        });
    };
};

module.exports = { requireTier, TIER_LEVELS };
