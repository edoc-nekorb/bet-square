import axios from 'axios';

export const bet9ja = {
    /**
     * Extract matches from a booking code
     * @param {string} code - The booking code
     */
    extract: async (code) => {
        try {
            const url = `https://coupon.bet9ja.com/desktop/feapi/CouponAjax/GetBookABetCoupon?couponCode=${code}&v_cache_version=1.301.2.219`;

            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://sports.bet9ja.com/',
                }
            });

            // The response puts matches in "D.O" object based on logs
            const selections = data.D?.O || {};

            const matches = [];

            for (const [key, item] of Object.entries(selections)) {
                // Parse teams from E_NAME "Home - Away"
                const teams = (item.E_NAME || '').split(' - ');
                const home = teams[0] || item.E_NAME;
                const away = teams[1] || '';

                matches.push({
                    id: item.E_ID,
                    gameId: item.E_ID,
                    home: home,
                    away: away,
                    league: item.GN || 'Unknown League',
                    country: 'World',
                    date: item.STARTDATE ? item.STARTDATE.replace(' ', 'T') : new Date().toISOString(),
                    timestamp: item.STARTDATE ? new Date(item.STARTDATE).getTime() : Date.now(),
                    market: {
                        id: item.marketId || item.M_NAME,
                        name: item.M_NAME,
                        specifier: ''
                    },
                    selection: {
                        id: item.signId || item.SGN,
                        name: item.SGN,
                        odds: parseFloat(item.V)
                    },
                    // Store strict raw data needed for re-booking 
                    raw: {
                        ...item,
                        id: key, // Set 'id' to the key string for booking mapping
                        sid: key.split('$')[1] || ''
                    }
                });
            }

            return matches;

        } catch (error) {
            console.error('Bet9ja Extraction Error:', error.message);
            throw new Error('Failed to extract booking code');
        }
    },

    /**
     * Book matches to generate a new code
     * @param {Array} matches - Array of normalized match objects
     */
    book: async (matches) => {
        try {
            const url = 'https://apigw.bet9ja.com/sportsbook/placebet/BookABetV2?source=desktop&v_cache_version=1.301.2.219';

            // We need to reconstruct the Bet9ja payload
            // This requires having the specific Bet9ja IDs (eventId, sid, etc.)
            // which should have been preserved during extraction.

            // Constructing BETS object
            const oddsMap = {};
            const evsMap = {};
            let totalStake = 100;
            let numLines = matches.length;

            matches.forEach(m => {
                // We rely on 'raw' data from extraction to repopulate these specific fields
                if (!m.raw || !m.raw.id) {
                    return;
                }

                const id = m.raw.id;
                oddsMap[id] = m.selection.odds.toString();

                evsMap[id] = m.raw;
            });

            // Construct inner structure
            const innerPayload = {
                BETS: [{
                    BSTYPE: 0,
                    TAB: 0,
                    NUMLINES: numLines,
                    COMB: 1,
                    TYPE: numLines,
                    STAKE: totalStake,
                    ODDS: oddsMap,
                    FIXED: {}
                }],
                EVS: evsMap,
                IMPERSONIZE: 0
            };

            // Send as Form Data: BETSLIP=<json_string>&IS_PASSBET=0
            const params = new URLSearchParams();
            params.append('BETSLIP', JSON.stringify(innerPayload));
            params.append('IS_PASSBET', '0');

            // console.log('Bet9ja Booking Payload (Form Data):', params.toString().substring(0, 150) + '...');

            const { data } = await axios.post(url, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://sports.bet9ja.com/',
                    'Origin': 'https://sports.bet9ja.com'
                }
            });

            // Parse response
            // The structure we saw in logs: { status: 1, data: [ { RIS: '...' } ] }
            // Some responses might be [ { RIS: ... } ]

            let result = data;

            // Check for wrapper structure
            if (data && Array.isArray(data.data)) {
                result = data.data[0];
            } else if (Array.isArray(data)) {
                result = data[0];
            }

            if (result && result.RIS) {
                return {
                    shareCode: result.RIS,
                    bizCode: result.RIS
                };
            }

            console.error('Bet9ja Booking Response (Failed Parse):', JSON.stringify(data));
            throw new Error('Failed to book ticket');

        } catch (error) {
            console.error('Bet9ja Booking Error:', error.message);
            throw new Error('Failed to generate booking code');
        }
    }
};
