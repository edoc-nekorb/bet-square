import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { matcher } from './matcher.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load team aliases for better search matching
let teamAliases = {};
try {
    teamAliases = JSON.parse(readFileSync(join(__dirname, '../data/teamAliases.json'), 'utf-8'));
} catch (e) {
    console.warn('[SportyBet] Could not load team aliases:', e.message);
}

const parser = new XMLParser();


const REGIONS = {
    'ng': 'ng',
    'gh': 'gh',
    'ke': 'ke',
    'ug': 'ug',
    'tz': 'tz'
};

export const sportybet = {
    /**
     * Extract matches from a booking code
     * @param {string} code - The booking code
     * @param {string} region - The region code (default 'ng')
     */
    extract: async (code, region = 'ng') => {
        try {
            const url = `https://www.sportybet.com/api/${region}/orders/share/${code}`;
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Accept': '*/*',
                    'Referer': 'https://www.sportybet.com/ng/sport/football/',
                    'clientid': 'web',
                    'platform': 'web'
                }
            });

            console.log('SportyBet Raw Data Type:', typeof data);

            // Parse XML response or handle JSON
            let jsonObj;
            if (typeof data === 'string' && data.trim().startsWith('<')) {
                jsonObj = parser.parse(data);
            } else {
                // Assume it might be JSON or already parsed JSON
                jsonObj = data;
            }

            // Normalize response structure
            // XML comes with BaseRsp wrapper, JSON does not (unless simulated)
            const root = jsonObj.BaseRsp ? jsonObj.BaseRsp : jsonObj;

            if (!root || (root.message !== 'Success' && root.message !== 'success' && root.message !== 'SUCCESS')) {
                console.error('API Error Message:', root?.message);
                throw new Error(root?.message || 'Invalid booking code or API error');
            }

            let outcomes = [];

            // Handle Structure: data.outcomes (JSON or XML converted)
            if (root.data?.outcomes) {
                const raw = root.data.outcomes;
                if (Array.isArray(raw)) {
                    outcomes = raw;
                } else if (raw.outcomes) { // XML often nests outcomes.outcomes
                    outcomes = Array.isArray(raw.outcomes) ? raw.outcomes : [raw.outcomes];
                }
            }
            // Handle Structure: data.ticket.selections (JSON or XML converted)
            else if (root.data?.ticket?.selections) {
                const raw = root.data.ticket.selections;
                if (Array.isArray(raw)) {
                    outcomes = raw;
                } else if (raw.selections) {
                    outcomes = Array.isArray(raw.selections) ? raw.selections : [raw.selections];
                }
            }

            return outcomes.map(match => {
                const eventId = match.eventId || '';
                const home = match.homeTeamName || `Event ${eventId}`;
                const away = match.awayTeamName || '';
                const gameId = match.gameId || eventId;

                let marketName = 'Market';
                let outcomeName = 'Selection';
                let odds = 1.0;
                let marketId = match.marketId;
                let outcomeId = match.outcomeId;
                let specifier = match.specifier || '';
                let league = match?.sport?.category?.tournament?.name || 'Unknown League';

                // Try to find market details in deep structure (Structure A)
                if (match.markets) {
                    let mkt;
                    // In JSON it's often an array "markets": [{...}]
                    // In XML it's "markets": { "markets": {...} }
                    if (Array.isArray(match.markets)) {
                        mkt = match.markets[0];
                    } else if (match.markets.markets) {
                        mkt = match.markets.markets;
                    }

                    if (mkt) {
                        marketId = mkt.id;
                        marketName = mkt.desc || mkt.name;
                        specifier = mkt.specifier || specifier;

                        let out;
                        if (mkt.outcomes) {
                            if (Array.isArray(mkt.outcomes)) {
                                out = mkt.outcomes[0];
                            } else if (mkt.outcomes.outcomes) {
                                const nested = mkt.outcomes.outcomes;
                                out = Array.isArray(nested) ? nested[0] : nested;
                            } else {
                                // Sometimes outcomes is just an object if only one? Or array directly
                                out = mkt.outcomes;
                            }
                        }

                        // If output is array (unlikely if outcomes is direct), handle it
                        if (Array.isArray(out)) out = out[0];

                        if (out) {
                            outcomeId = out.id;
                            outcomeName = out.desc || out.name || out.desc;
                            odds = parseFloat(out.odds);
                        }
                    }
                }

                return {
                    id: eventId,
                    gameId: gameId,
                    home: home,
                    away: away,
                    league: league,
                    country: match?.sport?.category?.name || 'World',
                    date: match.estimateStartTime ? new Date(parseInt(match.estimateStartTime)).toISOString() : new Date().toISOString(),
                    timestamp: match.estimateStartTime || Date.now(),
                    market: {
                        id: marketId,
                        name: marketName,
                        specifier: specifier
                    },
                    selection: {
                        id: outcomeId,
                        name: outcomeName,
                        odds: odds
                    },
                    raw: match
                };
            });
        } catch (error) {
            console.error('SportyBet Extraction Error:', error.message);
            throw new Error('Failed to extract booking code');
        }
    },

    /**
     * Book matches to generate a new code
     * @param {Array} matches - Array of normalized match objects
     * @param {string} region - The region code (default 'ng')
     */
    book: async (matches, region = 'ng') => {
        try {
            const url = `https://www.sportybet.com/api/${region}/orders/share`;

            // Construct payload from raw data
            console.log(`[SportyBet BOOK DEBUG] Processing ${matches.length} matches for booking`);

            const payload = {
                selections: matches.map(m => {
                    // Use gameId if available (from findEvent), otherwise fall back to id
                    const eventId = m.gameId || m.id;
                    console.log(`[SportyBet BOOK DEBUG] Match: ${m.home} vs ${m.away}, eventId: ${eventId}, marketId: ${m.market.id}, outcomeId: ${m.selection.id}, specifier: ${m.market.specifier || ''}`);

                    return {
                        eventId: eventId,
                        marketId: String(m.market.id),
                        specifier: m.market.specifier || '',
                        outcomeId: String(m.selection.id),
                        sportId: m.raw?.sport?.id || 'sr:sport:1'
                    };
                })
            };


            console.log('Booking Payload:', JSON.stringify(payload, null, 2));

            // SportyBet expects JSON body for booking
            const { data } = await axios.post(url, payload, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Content-Type': 'application/json',
                    'Referer': 'https://www.sportybet.com/ng/sport/football/',
                    'Origin': 'https://www.sportybet.com',
                    'clientid': 'web',
                    'platform': 'web'
                }
            });

            // Handle response (JSON or XML)
            let jsonObj;
            if (typeof data === 'string' && data.trim().startsWith('<')) {
                jsonObj = parser.parse(data);
            } else {
                jsonObj = data;
            }

            const root = jsonObj.BaseRsp ? jsonObj.BaseRsp : jsonObj;

            if (root && (root.message === 'Success' || root.message === 'SUCCESS')) {
                return {
                    shareCode: root.data.shareCode,
                    bizCode: root.bizCode
                };
            }

            console.error('Booking Response Error:', JSON.stringify(root, null, 2));
            throw new Error('Failed to book ticket');

        } catch (error) {
            console.error('SportyBet Booking Error:', error.message);
            throw new Error('Failed to generate booking code');
        }
    },

    /**
     * Find event by searching SportyBet API
     * @param {string} home - Home team name
     * @param {string} away - Away team name
     * @param {Date} date - Match date
     * @param {string} region - Region code (default 'ng')
     */
    findEvent: async (home, away, date, region = 'ng') => {
        try {
            // Helper function to get search queries from aliases
            const getSearchQueries = (teamName) => {
                const queries = [];
                const teamLower = teamName.toLowerCase().trim();

                // PASS 1: Check for EXACT alias matches first (highest priority)
                for (const [canonical, aliases] of Object.entries(teamAliases)) {
                    const allNames = [canonical, ...aliases].map(n => n.toLowerCase().trim());
                    // Exact match - team name equals one of the aliases exactly
                    if (allNames.includes(teamLower)) {
                        const sortedAliases = [canonical, ...aliases].sort((a, b) => a.length - b.length);
                        queries.push(...sortedAliases.slice(0, 3));
                        break;
                    }
                }

                // PASS 2: If no exact match, check if team name is a word within an alias
                // This is lower priority to avoid "Milan" matching "Inter Milan"
                if (queries.length === 0) {
                    for (const [canonical, aliases] of Object.entries(teamAliases)) {
                        const allNames = [canonical, ...aliases].map(n => n.toLowerCase().trim());
                        const isWordMatch = allNames.some(n => {
                            const nWords = n.split(/\s+/);
                            return nWords.includes(teamLower);
                        });
                        if (isWordMatch) {
                            const sortedAliases = [canonical, ...aliases].sort((a, b) => a.length - b.length);
                            queries.push(...sortedAliases.slice(0, 3));
                            break;
                        }
                    }
                }

                // FALLBACK: If no aliases found, use the original name variations
                if (queries.length === 0) {
                    // Remove common prefixes/suffixes first
                    const cleaned = teamName.replace(/\b(FC|SC|CF|AC|AS|AFC|SV|VfB|1\.|FSV|US|SS)\b/gi, '').trim();
                    if (cleaned.length > 2) {
                        queries.push(cleaned);
                    }
                    queries.push(teamName);
                    // First word (if > 3 chars and not just prefix)
                    const firstWord = teamName.split(' ')[0];
                    if (firstWord.length > 3 && !['AC', 'FC', 'SC', 'AS', 'US', 'SS'].includes(firstWord.toUpperCase()) && !queries.includes(firstWord)) {
                        queries.push(firstWord);
                    }
                }

                return [...new Set(queries)]; // Remove duplicates
            };



            const searchQueries = getSearchQueries(home);

            console.log(`[SportyBet SEARCH DEBUG] Searching for: "${home}" vs "${away}" -> queries: ${JSON.stringify(searchQueries)}`);

            let allEvents = [];

            // Try each search query until we get results
            for (const query of searchQueries) {
                if (allEvents.length > 0) break;

                const url = `https://www.sportybet.com/api/${region}/factsCenter/event/firstSearch?keyword=${encodeURIComponent(query)}&offset=0&pageSize=50&withOneUpMarket=true&withTwoUpMarket=true`;

                const { data } = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                        'Accept': 'application/json, text/plain, */*',
                        'clientid': 'wap',
                        'Referer': `https://www.sportybet.com/${region}/m/sport/football/`,
                        'Origin': 'https://www.sportybet.com'
                    }
                });

                if (data && data.bizCode === 10000) {
                    const preMatchEvents = data.data?.preMatch || [];
                    const liveEvents = data.data?.live || [];

                    // Filter out Simulated Reality League matches
                    const filterSRL = (events) => events.filter(e => {
                        const name = ((e.homeTeamName || '') + (e.awayTeamName || '')).toLowerCase();
                        const tournament = (e.sport?.category?.tournament?.name || '').toLowerCase();
                        return !name.includes(' srl') && !tournament.includes('simulated reality');
                    });

                    allEvents = [...filterSRL(preMatchEvents), ...filterSRL(liveEvents)];

                    if (allEvents.length > 0) {
                        console.log(`[SportyBet SEARCH DEBUG] Query "${query}" found ${allEvents.length} events`);
                    }
                }
            }

            console.log(`[SportyBet SEARCH DEBUG] Total: ${allEvents.length} events (after filtering SRL)`);

            if (allEvents.length === 0) return null;

            // Map to normalized format for matcher
            const potentialMatches = allEvents.map(e => ({
                id: e.eventId, // Betradar ID like "sr:match:64595720"
                gameId: e.eventId, // Use eventId as gameId for booking
                home: e.homeTeamName,
                away: e.awayTeamName,
                date: new Date(e.estimateStartTime).toISOString(),
                timestamp: e.estimateStartTime,
                raw: e
            }));

            // Log first few results
            if (potentialMatches.length > 0) {
                console.log(`[SportyBet SEARCH DEBUG] First 3 results:`);
                potentialMatches.slice(0, 3).forEach((m, i) => {
                    console.log(`  [${i}] ${m.home} vs ${m.away} (ID: ${m.id})`);
                });
            }

            // Use fuzzy matcher to find the best match
            const result = matcher.findMatchingEvent({ home, away, date }, potentialMatches, 0.5);
            console.log(`[SportyBet SEARCH DEBUG] Matcher result:`, result ? `Found: ${result.home} vs ${result.away} (ID: ${result.id})` : 'NOT FOUND');

            return result;

        } catch (error) {
            console.warn('[SportyBet SEARCH DEBUG] Error:', error.message);
            return null;
        }
    }
};

