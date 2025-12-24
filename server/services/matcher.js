import { createRequire } from "module";
const require = createRequire(import.meta.url);
const teamAliases = require("../data/teamAliases.json");

/**
 * Enhanced Fuzzy Matcher Service for Team Names
 * Uses multi-field comparison for improved accuracy:
 * - item_name (full match string)
 * - home_team + away_team (individual team matching)
 * - item_date / item_utc_date (date validation)
 * - sport_id (sport filtering)
 */
export const matcher = {
    /**
     * Calculate Levenshtein Distance between two strings
     */
    levenshteinDistance: (a, b) => {
        if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);

        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    },

    /**
     * Normalize team name for better matching
     * Removes common prefixes/suffixes, special chars, and checks alias database
     */
    normalizeTeamName: (name) => {
        if (!name) return '';

        let normalized = name
            .toLowerCase()
            .replace(/\b(fc|ac|sc|cf|as|afc|united|city|town|hotspur|real|inter|sporting|calcio|deportivo|fk|sk|nk)\b/gi, '')
            .replace(/^\d+\.\s*/g, '')
            .replace(/\b\d+\.\s*/g, '')
            .replace(/\s+(05|04|1846|1899|1907|1909|1914|1916|1920|1948)$/g, '')
            .replace(/\b(fsv|sv|vfb|tsg|bsc|vfl|rsc)\b/gi, '')
            .replace(/[^a-z0-9\s]/g, '')  // Remove special chars like dots in P.A.O.K.
            .replace(/\s+/g, ' ')
            .trim();

        const normalizedClean = normalized.replace(/\s/g, '');

        // Check alias database
        for (const [canonical, aliases] of Object.entries(teamAliases)) {
            const cleanCanonical = canonical.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Check if normalized name matches canonical
            if (cleanCanonical === normalizedClean ||
                cleanCanonical.includes(normalizedClean) ||
                normalizedClean.includes(cleanCanonical)) {
                console.log(`[Matcher] Alias found: "${name}" -> "${canonical}" (canonical match)`);
                return canonical.replace(/_/g, ' ');
            }

            // Check against all aliases
            for (const alias of aliases) {
                const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanAlias === normalizedClean ||
                    cleanAlias.includes(normalizedClean) ||
                    normalizedClean.includes(cleanAlias)) {
                    console.log(`[Matcher] Alias found: "${name}" -> "${canonical}" (via alias "${alias}")`);
                    return canonical.replace(/_/g, ' ');
                }
            }
        }

        console.log(`[Matcher] No alias found for: "${name}" -> using normalized: "${normalized}"`);
        return normalized;
    },


    /**
     * Normalize full item_name (match string like "Home - Away")
     */
    normalizeItemName: (itemName) => {
        if (!itemName) return '';
        return itemName
            .toLowerCase()
            .replace(/\s+vs\s+/gi, ' - ')
            .replace(/[^a-z0-9\s\-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Parse date to UTC timestamp for comparison
     * Handles: "2023-10-08 17:30:00" or ISO strings
     */
    parseToUTC: (dateStr) => {
        if (!dateStr) return null;
        try {
            // If already a timestamp
            if (typeof dateStr === 'number') return dateStr;

            // Parse the date string
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;

            return date.getTime();
        } catch (e) {
            return null;
        }
    },

    /**
     * Calculate similarity score between 0 and 1
     */
    calculateSimilarity: (name1, name2) => {
        const n1 = matcher.normalizeTeamName(name1);
        const n2 = matcher.normalizeTeamName(name2);

        if (n1 === n2) return 1;
        if (!n1 || !n2) return 0;

        // Check if one contains the other (partial match boost)
        if (n1.includes(n2) || n2.includes(n1)) {
            return 0.9;
        }

        const distance = matcher.levenshteinDistance(n1, n2);
        const maxLength = Math.max(n1.length, n2.length);
        return 1 - (distance / maxLength);
    },

    /**
     * Calculate item_name similarity (full match string comparison)
     */
    calculateItemNameSimilarity: (itemName1, itemName2) => {
        const n1 = matcher.normalizeItemName(itemName1);
        const n2 = matcher.normalizeItemName(itemName2);

        if (n1 === n2) return 1;
        if (!n1 || !n2) return 0;

        const distance = matcher.levenshteinDistance(n1, n2);
        const maxLength = Math.max(n1.length, n2.length);
        return 1 - (distance / maxLength);
    },

    /**
     * Check if two dates are within acceptable range (±3 hours)
     * Returns a score: 1 for exact, scales down to 0 beyond 3 hours
     */
    calculateDateProximity: (date1, date2, maxHours = 3) => {
        const time1 = matcher.parseToUTC(date1);
        const time2 = matcher.parseToUTC(date2);

        if (!time1 || !time2) return 0.5; // Unknown dates - neutral score

        const diffHours = Math.abs(time1 - time2) / (1000 * 60 * 60);

        if (diffHours <= 0.5) return 1;      // Within 30 min - exact match
        if (diffHours <= maxHours) return 0.8; // Within 3 hours - likely same match
        if (diffHours <= 12) return 0.3;      // Within 12 hours - possible (timezone issues)
        return 0;                              // Too far apart - not the same match
    },

    /**
     * ENHANCED: Find best matching event with multi-field comparison
     * 
     * @param {Object} sourceMatch - The match to find
     *   - home: home team name
     *   - away: away team name
     *   - date: match date/time
     *   - itemName: (optional) full "Home - Away" string
     *   - sportId: (optional) sport type
     * @param {Array} targetEvents - List of events from target bookie
     * @param {Object} options - Matching options
     *   - threshold: minimum score (default 0.65)
     *   - dateWeight: importance of date matching (default 0.2)
     *   - teamWeight: importance of team matching (default 0.6)
     *   - itemNameWeight: importance of full name matching (default 0.2)
     * @returns {Object|null} Best matched event with score, or null
     */
    findMatchingEvent: (sourceMatch, targetEvents, options = {}) => {
        const {
            threshold = 0.65,
            dateWeight = 0.2,
            teamWeight = 0.6,
            itemNameWeight = 0.2
        } = options;

        let bestMatch = null;
        let bestScore = 0;
        let matchDetails = null;

        const sourceHome = sourceMatch.home || sourceMatch.home_team;
        const sourceAway = sourceMatch.away || sourceMatch.away_team;
        const sourceDate = sourceMatch.date || sourceMatch.item_date || sourceMatch.item_utc_date;
        const sourceItemName = sourceMatch.itemName || sourceMatch.item_name || `${sourceHome} - ${sourceAway}`;
        const sourceSportId = sourceMatch.sportId || sourceMatch.sport_id || 'soccer';

        console.log(`[Matcher] Finding match for: ${sourceHome} vs ${sourceAway} (${sourceDate})`);

        for (const target of targetEvents) {
            // 1. Sport filtering (if available)
            const targetSportId = target.sportId || target.sport_id || 'soccer';
            if (sourceSportId !== targetSportId) {
                continue; // Skip different sports
            }

            const targetHome = target.home || target.home_team;
            const targetAway = target.away || target.away_team;
            const targetDate = target.date || target.item_date || target.timestamp;
            const targetItemName = target.itemName || target.item_name || `${targetHome} - ${targetAway}`;

            // 2. Date proximity check (strict - skip if too far)
            const dateScore = matcher.calculateDateProximity(sourceDate, targetDate);
            if (dateScore === 0) continue; // Too far apart, skip

            // 3. Team matching (weighted home + away)
            const homeScore = matcher.calculateSimilarity(sourceHome, targetHome);
            const awayScore = matcher.calculateSimilarity(sourceAway, targetAway);
            const teamScore = (homeScore + awayScore) / 2;

            // 4. Item name matching (full string as fallback)
            const itemNameScore = matcher.calculateItemNameSimilarity(sourceItemName, targetItemName);

            // 5. Calculate weighted final score
            const finalScore = (
                (dateScore * dateWeight) +
                (teamScore * teamWeight) +
                (itemNameScore * itemNameWeight)
            );

            // 6. Track best match
            if (finalScore > bestScore && finalScore >= threshold) {
                bestScore = finalScore;
                bestMatch = target;
                matchDetails = {
                    dateScore: dateScore.toFixed(2),
                    teamScore: teamScore.toFixed(2),
                    homeScore: homeScore.toFixed(2),
                    awayScore: awayScore.toFixed(2),
                    itemNameScore: itemNameScore.toFixed(2),
                    finalScore: finalScore.toFixed(2)
                };
            }
        }

        if (bestMatch) {
            console.log(`[Matcher] ✓ Found match: ${bestMatch.home || bestMatch.home_team} vs ${bestMatch.away || bestMatch.away_team}`);
            console.log(`[Matcher]   Scores: ${JSON.stringify(matchDetails)}`);
        } else {
            console.log(`[Matcher] ✗ No match found for: ${sourceHome} vs ${sourceAway}`);
        }

        return bestMatch;
    },

    /**
     * Find matching event with strict mode (for critical conversions)
     * Uses higher threshold and stricter date matching
     */
    findMatchingEventStrict: (sourceMatch, targetEvents) => {
        return matcher.findMatchingEvent(sourceMatch, targetEvents, {
            threshold: 0.75,
            dateWeight: 0.3,
            teamWeight: 0.5,
            itemNameWeight: 0.2
        });
    },

    /**
     * Find matching event with relaxed mode (for broader searches)
     * Uses lower threshold and more forgiving matching
     */
    findMatchingEventRelaxed: (sourceMatch, targetEvents) => {
        return matcher.findMatchingEvent(sourceMatch, targetEvents, {
            threshold: 0.55,
            dateWeight: 0.1,
            teamWeight: 0.7,
            itemNameWeight: 0.2
        });
    },

    /**
     * Batch find matches for multiple source events
     * Returns array of { source, target, score } objects
     */
    findMatchingEvents: (sourceMatches, targetEvents, options = {}) => {
        const results = [];

        for (const source of sourceMatches) {
            const target = matcher.findMatchingEvent(source, targetEvents, options);
            results.push({
                source,
                target,
                matched: !!target
            });
        }

        const matched = results.filter(r => r.matched).length;
        console.log(`[Matcher] Batch result: ${matched}/${sourceMatches.length} matches found`);

        return results;
    }
};
