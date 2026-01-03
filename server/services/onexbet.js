import axios from 'axios';
import { matcher } from './matcher.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teamAliases = require('../data/teamAliases.json');

export const onexbet = {
    /**
     * Extract matches from a booking code
     * @param {string} code - The booking code
     */
    extract: async (code) => {
        try {
            const url = 'https://1xbet.ng/service-api/LiveBet/Open/GetCoupon';
            const payload = {
                Guid: code,
                Lng: "en",
                partner: 159
            };

            const { data } = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://1xbet.ng/en/',
                    'Origin': 'https://1xbet.ng'
                }
            });

            if (!data.Success) {
                console.error('1xBet API Error:', data.Error);
                throw new Error(data.Error || 'Invalid booking code');
            }

            const events = data.Value?.Events || [];

            return events.map(event => {
                // Extract Param into specifier for mapping usage
                let specifier = '';
                const paramVal = event.Param || event.P;
                if (paramVal !== undefined) {
                    specifier = `param=${paramVal}`;
                }

                return {
                    gameId: event.GameId || event.ConstId,
                    home: event.Opp1,
                    away: event.Opp2,
                    league: event.Liga, // Keep league from original
                    country: event.ConstCategory || 'World', // Keep country from original
                    date: event.StartStr,
                    timestamp: event.Start * 1000, // Keep timestamp from original
                    market: {
                        id: event.GroupCoefId || event.Type, // Market Type ID (e.g. 1)
                        name: event.GroupName, // e.g. "1x2"
                        specifier: specifier
                    },
                    selection: {
                        id: event.CoefId, // Or similar
                        name: event.MarketName || event.CoefName, // e.g. "1X"
                        odds: event.Coef
                    },
                    raw: event
                };
            });

        } catch (error) {
            console.error('1xBet Extraction Error:', error.message);
            throw new Error('Failed to extract matching code');
        }
    },

    book: async (matches) => {
        try {
            const url = 'https://1xbet.ng/service-api/LiveBet/Open/SaveCoupon';

            // Reconstruct payload based on extraction structure
            // DEBUG: Log what we're sending
            console.log('[1xBet BOOK DEBUG] Building payload for matches:', matches.length);

            // Convert string outcome IDs to numeric IDs for 1xBet API
            const outcomeToNumeric = {
                // 1X2 Market
                'W1': 1, 'w1': 1, 'Home': 1, 'home': 1, '1': 1,
                'X': 2, 'x': 2, 'Draw': 2, 'draw': 2,
                'W2': 3, 'w2': 3, 'Away': 3, 'away': 3, '2': 3,
                // Over/Under
                'Over': 9, 'over': 9, 'O': 9,
                'Under': 10, 'under': 10, 'U': 10,
                // BTTS
                'Yes': 1, 'yes': 1, 'GG': 1,
                'No': 2, 'no': 2, 'NG': 2,
                // Double Chance
                '1X': 1, '1x': 1,
                '12': 2,
                'X2': 3, 'x2': 3
            };

            const events = matches.map(m => {
                // Convert selection ID to numeric
                let numericOutcome = outcomeToNumeric[m.selection.id];
                if (!numericOutcome && typeof m.selection.id === 'number') {
                    numericOutcome = m.selection.id; // Already numeric
                }
                if (!numericOutcome) {
                    numericOutcome = parseInt(m.selection.id) || 1; // Fallback
                }

                console.log(`[1xBet BOOK DEBUG] Match: ${m.home} vs ${m.away}, GameId: ${m.gameId}, MarketId: ${m.market.id}, SelectionId: ${m.selection.id} -> NumericT: ${numericOutcome}, Odds: ${m.selection.odds}`);

                // Extract numeric Param from specifier for Over/Under markets
                // Specifier formats: "total=1.5", "1.5", or empty
                let param = 0;
                if (m.market.specifier) {
                    const specifier = String(m.market.specifier);
                    // Try to extract number from formats like "total=1.5", "1.5", "-2", or "0:1" (if fallback)
                    // Updated regex to handle negative numbers
                    const match = specifier.match(/(-?\d+\.?\d*)/);
                    if (match) {
                        param = parseFloat(match[1]);
                    }
                }

                // For Over/Under markets, also try to get goal line from selection name
                // e.g., "Over 0.5" or "Over 1.5"
                if (param === 0 && m.selection.name) {
                    const match = m.selection.name.match(/(\d+\.?\d*)/);
                    if (match) {
                        param = parseFloat(match[1]);
                    }
                }

                console.log(`[1xBet BOOK DEBUG]   Param: ${param}`);

                return {
                    GameId: m.gameId,
                    Type: numericOutcome, // *** THIS IS THE OUTCOME ID, not market ID ***
                    Coef: m.selection.odds,
                    Param: param,
                    PV: null,
                    PlayerId: 0,
                    Kind: 3, // Pre-match
                    InstrumentId: 0,
                    Seconds: 0,
                    Price: 0,
                    Expired: 0,
                    PlayersDuel: {
                        Team1Ids: null,
                        Team2Ids: null
                    }
                };

            });

            const payload = {
                Events: events,
                Lng: "en",
                partner: 159,
                Vid: 1, // Changed from 0 to 1 as per sample
                notWait: true,
                CheckCf: 1,
                Summ: 1000,
                // These might be needed based on sample
                Source: 159
            };

            const { data } = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://1xbet.ng/en/',
                    'Origin': 'https://1xbet.ng'
                }
            });

            if (!data.Success) {
                console.error('1xBet Booking Error:', data.Error);
                throw new Error(data.Error || 'Failed to book ticket');
            }

            return {
                shareCode: data.Value,
                bizCode: data.Value
            };

        } catch (error) {
            console.error('1xBet Booking Error:', error.message);
            throw new Error('Failed to generate booking code');
        }
    },

    findEvent: async (home, away, date) => {
        try {
            // Helper function to get search queries from aliases (Adapted from SportyBet service)
            const getSearchQueries = (teamName) => {
                const queries = [];
                // Clean the team name first - remove special chars like dots in P.A.O.K.
                const cleanedName = teamName.replace(/\./g, '').trim();
                const teamLower = cleanedName.toLowerCase().trim();

                // 1. Add basic variations
                queries.push(matcher.normalizeTeamName(home));
                queries.push(home); // Original e.g. "PAOK"
                queries.push(cleanedName); // e.g. "PAOK"

                // 2. Expand using Alias Database
                // We check if the input name matches any Key or any Value in the alias DB
                for (const [canonical, aliases] of Object.entries(teamAliases)) {
                    const allNames = [canonical, ...aliases].map(n => n.toLowerCase().replace(/\./g, '').trim());

                    // distinct check logic similar to SportyBet
                    if (allNames.includes(teamLower)) {
                        console.log(`[1xBet SEARCH DEBUG] Alias expansion found for "${home}" -> "${canonical}"`);

                        // Add canonical matches
                        queries.push(canonical);
                        // Add all aliases (including those with dots!)
                        queries.push(...aliases);
                        break;
                    }
                }

                return [
                    ...queries,
                    home.replace(/\b(FC|SC|CF|AC|AS|AFC|SV|VfB|1\.|FSV|US|SS)\b/gi, '').trim(),
                    home.split(' ').find(w => w.length > 3) || home.split(' ')[0]
                ].filter(q => q && q.length > 2);
            };

            // Improved search logic
            const queries = getSearchQueries(home);
            // Deduplicate
            const searchQueries = [...new Set(queries)];

            console.log(`[1xBet SEARCH DEBUG] Searching for: "${home}" vs "${away}" -> queries: ${JSON.stringify(searchQueries)}`);

            let eventsFromAllQueries = [];
            let bestMatchFromAllQueries = null;

            // Try each search query
            for (const query of searchQueries) {
                if (bestMatchFromAllQueries) break;

                const lineUrl = `https://1xbet.ng/service-api/LineFeed/Web_SearchZip?text=${encodeURIComponent(query)}&limit=50&gr=412&lng=en&country=132&mode=4&partner=159&userId=0`;
                const liveUrl = `https://1xbet.ng/service-api/LiveFeed/Web_SearchZip?text=${encodeURIComponent(query)}&limit=50&gr=412&lng=en&country=132&mode=4&partner=159&userId=0`;

                const [lineRes, liveRes] = await Promise.all([
                    axios.get(lineUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', 'Referer': 'https://1xbet.ng/en/', 'Origin': 'https://1xbet.ng' }
                    }).catch(e => ({ data: { Value: [] } })),
                    axios.get(liveUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', 'Referer': 'https://1xbet.ng/en/', 'Origin': 'https://1xbet.ng' }
                    }).catch(e => ({ data: { Value: [] } }))
                ]);

                const lineResults = lineRes.data?.Value || [];
                const liveResults = liveRes.data?.Value || [];
                const currentEvents = [...lineResults, ...liveResults];

                if (currentEvents.length > 0) {
                    console.log(`[1xBet SEARCH DEBUG] Query "${query}" found ${currentEvents.length} results`);

                    // Filter results using our fuzzy matcher
                    const potentialMatches = currentEvents.map(r => ({
                        id: r.I,
                        gameId: r.I,
                        home: r.O1,
                        away: r.O2,
                        date: new Date(r.S * 1000).toISOString(),
                        timestamp: r.S * 1000
                    }));

                    // Check if we have a good match in this batch
                    const match = matcher.findMatchingEvent({ home, away, date }, potentialMatches, 0.6);

                    if (match) {
                        console.log(`[1xBet SEARCH DEBUG] Match FOUND in query "${query}": ${match.home} vs ${match.away}`);
                        bestMatchFromAllQueries = match;
                        break;
                    }

                    // Accumulate events
                    eventsFromAllQueries = [...eventsFromAllQueries, ...potentialMatches];
                }
            }

            if (bestMatchFromAllQueries) {
                return bestMatchFromAllQueries;
            }

            console.log(`[1xBet SEARCH DEBUG] Total unique events accumulated: ${eventsFromAllQueries.length}`);

            if (eventsFromAllQueries.length === 0) return null;

            // Final fallback search across all unique events
            const uniqueEvents = Array.from(new Map(eventsFromAllQueries.map(item => [item.id, item])).values());

            if (uniqueEvents.length > 0) {
                console.log(`[1xBet SEARCH DEBUG] First 3 unique results:`);
                uniqueEvents.slice(0, 3).forEach((m, i) => {
                    console.log(`  [${i}] ${m.home} vs ${m.away} (ID: ${m.id})`);
                });
            }

            // Use lower threshold (0.55) for fallback
            const result = matcher.findMatchingEvent({ home, away, date }, uniqueEvents, 0.55);
            console.log(`[1xBet SEARCH DEBUG] Matcher result (Final):`, result ? `Found: ${result.home} vs ${result.away} (ID: ${result.id})` : 'NOT FOUND');

            return result;

        } catch (error) {
            console.warn('1xBet Search Error:', error.message);
            return null;
        }
    }
};
