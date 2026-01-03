import { createRequire } from "module";
const require = createRequire(import.meta.url);
const marketMappings = require("../data/marketMappings.json");

export const mapping = {
    // Standardize Market Names to internal keys
    // SportyBet Market IDs -> Internal Key
    // internal_key: { sportbet: "id", onexbet: "id", bet9ja: "id" }

    markets: {
        '1X2': {
            internal: '1X2',
            sportybet: '1', // Speculative: usually 1 or 1x2 
            onexbet: '1',   // Speculative
            bet9ja: '1X2'
        },
        'Double Chance': {
            internal: 'DC',
            sportybet: '10', // Speculative
            onexbet: '8',    // Speculative
            bet9ja: 'DC'
        },
        'Over/Under 2.5': {
            internal: 'OV25',
            sportybet: '18',
            onexbet: '17',
            bet9ja: 'OV25'
        },
        'GG/NG': {
            internal: 'GG',
            sportybet: '29',
            onexbet: '19',
            bet9ja: 'GG'
        },

        'Handicap': {
            internal: 'Handicap',
            sportybet: '14',
            onexbet: '7',
            bet9ja: '349' // Default, changes by line
        }
    },

    /**
     * Map source match to target bookmaker format
     */
    convert: (matches, source, target) => {
        const sourceKey = source.toLowerCase();
        const targetKey = target.toLowerCase();

        const mapped = [];

        for (const match of matches) {
            // Normalize Market Name (rudimentary)
            // In real app, we need a smarter normalizer or keys from extraction
            // e.g. "1X2", "Match Result" -> "1X2"

            let marketType = null;
            const mName = match.market.name.toLowerCase();
            const mId = String(match.market.id);

            // Identify standard market type from source name
            if (mName.includes('1x2') || mName.includes('winner') || mName.includes('match') || mName === '1' || mName === '1x2') marketType = '1X2';
            else if (mName.includes('over') || mName.includes('under') || mName.includes('total')) marketType = 'Over/Under';
            else if (mName.includes('double') || mName.includes('chance')) marketType = 'Double Chance';
            else if (mName.includes('both') || mName.includes('goal') || mName.includes('btts') || mName.includes('gg')) marketType = 'Both Teams To Score';
            else if (mName.includes('handicap') || mId === '14' || mId === '7' || mId === '349') marketType = 'Handicap';

            if (!marketType || !marketMappings[marketType]) {
                // Return generic match structure but mark as failed mapping internally if needed?
                // For now, pass through what we have, maybe it works by luck or robust backend on target.
                mapped.push({ ...match, status: 'unmapped_market' });
                continue;
            }

            const mappingConfig = marketMappings[marketType];

            // Handle key mismatch (file uses '1xbet', code might use 'onexbet')
            const cleanTargetKey = targetKey === 'onexbet' ? '1xbet' : targetKey;
            const cleanSourceKey = sourceKey === 'onexbet' ? '1xbet' : sourceKey;

            const targetConfig = mappingConfig[cleanTargetKey];
            const sourceConfig = mappingConfig[cleanSourceKey];

            if (!targetConfig) {
                mapped.push({ ...match, status: 'target_unsupported' });
                continue;
            }

            // Map Selection Outcomes
            // We match source selection name -> Canonical -> Target ID
            const selectionName = match.selection.name;
            const selectionId = match.selection.id;
            let targetOutcomeId = null;
            let targetSpecifier = match.market.specifier || '';

            // 1. Normalization - moved up to support dynamic specifier logic
            let canonicalSelection = null;
            if (sourceConfig && sourceConfig.outcomes) {
                const sName = selectionName.toLowerCase();
                for (const [key, val] of Object.entries(sourceConfig.outcomes)) {
                    if (sName === key.toLowerCase() || sName === val.toString().toLowerCase()) {
                        canonicalSelection = key;
                        break;
                    }
                }
            }
            if (!canonicalSelection) {
                let sLower = selectionName.toLowerCase().trim();
                sLower = sLower.replace(/\(.*\)/, '').trim();

                if (['1', 'home', 'w1', 'h', '1.0'].includes(sLower) || sLower.startsWith('home') || sLower.startsWith('handicap 1')) canonicalSelection = 'Home';
                else if (['2', 'away', 'w2', 'a', '2.0'].includes(sLower) || sLower.startsWith('away') || sLower.startsWith('handicap 2')) canonicalSelection = 'Away';
                else if (['x', 'draw', 'd', '0'].includes(sLower)) canonicalSelection = 'Draw';
                else if (sLower.includes('over') || sLower === 'o') canonicalSelection = 'Over';
                else if (sLower.includes('under') || sLower === 'u') canonicalSelection = 'Under';
                else if (sLower.includes('both teams to score - yes') || sLower.includes('btts - yes') || ['yes', 'gg', 'y', 'btts yes'].includes(sLower)) canonicalSelection = 'Yes';
                else if (sLower.includes('both teams to score - no') || sLower.includes('btts - no') || ['no', 'ng', 'n', 'btts no'].includes(sLower)) canonicalSelection = 'No';
                else if (['1x', 'home or draw', 'hd'].includes(sLower) || sLower.includes('1x')) canonicalSelection = '1X';
                else if (['12', 'home or away', 'ha', '1 or 2'].includes(sLower) || sLower.includes('12')) canonicalSelection = '12';
                else if (['x2', '2x', 'draw or away', 'da'].includes(sLower) || sLower.includes('x2')) canonicalSelection = 'X2';
            }

            // --- DYNAMIC LOGIC ---

            // For Over/Under markets, extract the goal line from selection name
            // e.g., "Total Over (1.5)" or "Over 2.5" should generate specifier "total=1.5" or "total=2.5"
            if (marketType === 'Over/Under' && cleanTargetKey === 'sportybet') {
                console.log(`[MAPPING DEBUG] Over/Under market detected - source specifier: "${targetSpecifier}"`);
                const goalLineMatch = selectionName.match(/(\d+\.?\d*)/);
                if (goalLineMatch) {
                    targetSpecifier = `total=${goalLineMatch[1]}`;
                    console.log(`[MAPPING DEBUG] Generated specifier for Over/Under: ${targetSpecifier}`);
                }
            }

            // For 1xBet Over/Under, we need to ensure specifier format is understandable or converted to param
            // (1xbet booking normally takes param in 'Param' field, parsed from specifier if present)
            if (marketType === 'Over/Under' && cleanTargetKey === '1xbet') {
                // Try to get line from source specifier "total=2.5" -> "2.5"
                if (match.market.specifier && match.market.specifier.includes('total=')) {
                    targetSpecifier = match.market.specifier.split('=')[1];
                } else {
                    // Or from selection name
                    const goalLineMatch = selectionName.match(/(\d+\.?\d*)/);
                    if (goalLineMatch) targetSpecifier = goalLineMatch[1];
                }
            }

            // HANDICAP LOGIC
            if (marketType === 'Handicap') {
                console.log(`[MAPPING DEBUG] Handicap market detected. Source spec: "${match.market.specifier}", Name: "${mName}"`);

                let line = null;  // e.g. "1:0"

                // 1. Extract Line
                // Try Specifier first (SportyBet uses hcp=1:0)
                if (match.market.specifier && match.market.specifier.includes('hcp=')) {
                    line = match.market.specifier.split('hcp=')[1].split('&')[0]; // Handle potential extra params
                }
                // Try Param from specifier (1xBet uses param=-1)
                else if (match.market.specifier && match.market.specifier.includes('param=')) {
                    const pVal = parseFloat(match.market.specifier.split('param=')[1]);
                    if (!isNaN(pVal) && canonicalSelection) {
                        // Derive Line from Param + Selection
                        // Logic:
                        // If Home: Param = H - A
                        // If Away: Param = A - H
                        // We want H:A format.

                        let effectiveH = 0;
                        let effectiveA = 0;
                        let diff = 0; // H - A

                        if (canonicalSelection === 'Away' || canonicalSelection === 'X2') {
                            // Param = A - H => diff = -Param
                            diff = -pVal;
                        } else {
                            // Param = H - A => diff = Param
                            diff = pVal;
                        }

                        if (diff > 0) {
                            effectiveH = diff;
                            effectiveA = 0;
                        } else {
                            effectiveH = 0;
                            effectiveA = -diff; // e.g. -(-2) = 2
                        }

                        // Round to avoid floats if possible, or keep precision
                        line = `${effectiveH}:${effectiveA}`;
                    }
                }
                // Try Market Name (e.g. "Handicap 1:0")
                else if (mName.match(/(\d+:\d+)/)) {
                    line = mName.match(/(\d+:\d+)/)[0];
                }

                console.log(`[MAPPING DEBUG] Extracted Handicap Line: ${line} (Derived from Param? ${match.market.specifier.includes('param=')})`);

                if (line) {
                    // 2. Format for Target

                    // SportyBet Target: needs "hcp=1:0" string
                    if (cleanTargetKey === 'sportybet') {
                        targetSpecifier = `hcp=${line}`;
                    }

                    // 1xBet Target: needs Param (numeric/float usually, or string?)
                    // For European handicap "1:0", 1xBet is Market 7, Param... 1?
                    // If line is "1:0" -> Home starts +1. Param = 1?
                    // If line is "0:1" -> Away starts +1. Param = -1? or just 1 but we pick different outcome?
                    // Actually, 1xBet handicap often uses Param=1 for "1:0" and maybe Param=-1 for "0:1"?
                    // Let's assume simplest: pass the line, let booker handle strict logic or basic parsing.
                    // But 1xBet booker expects a float in Param.
                    if (cleanTargetKey === '1xbet') {
                        const [h, a] = line.split(':').map(Number);
                        // Calculate param based on Selected Team perspective
                        if (canonicalSelection === 'Away' || canonicalSelection === 'X2') {
                            // Perspective of Away: (Away - Home)
                            targetSpecifier = String(a - h);
                            // 1xBet uses Market ID 8 for Away Handicap
                            targetConfig.marketId = '8';
                        } else {
                            // Perspective of Home or Draw: (Home - Away)
                            targetSpecifier = String(h - a);
                            // 1xBet uses Market ID 7 for Home Handicap
                            targetConfig.marketId = '7';
                        }
                    }

                    // Bet9ja Target: Market ID changes!
                    // We need to map line "1:0" -> ID 349, "0:1" -> ID ???
                    // Since we don't have the table, we'll rely on the default mapped ID for now
                    // or user needs to add more logic.
                    // But we will pass the specifier so maybe we can lookup later.
                }
            }



            // DEBUG LOGGING
            console.log(`[MAPPING DEBUG] Match: ${match.home} vs ${match.away}`);
            console.log(`[MAPPING DEBUG] Market: ${match.market.name} (ID: ${match.market.id}), MarketType: ${marketType}`);
            console.log(`[MAPPING DEBUG] Selection Name: "${selectionName}", Selection ID: ${selectionId}`);



            // Fallback Normalization - handle all common formats
            if (!canonicalSelection) {
                let sLower = selectionName.toLowerCase().trim();
                // Remove (...) content often found in handicap e.g. "Home (1:0)" -> "home"
                sLower = sLower.replace(/\(.*\)/, '').trim();

                // 1X2 Market
                if (['1', 'home', 'w1', 'h', '1.0'].includes(sLower) || sLower.startsWith('home')) canonicalSelection = 'Home';
                else if (['2', 'away', 'w2', 'a', '2.0'].includes(sLower) || sLower.startsWith('away')) canonicalSelection = 'Away';
                else if (['x', 'draw', 'd', '0'].includes(sLower)) canonicalSelection = 'Draw';
                // Over/Under
                else if (sLower.includes('over') || sLower === 'o') canonicalSelection = 'Over';
                else if (sLower.includes('under') || sLower === 'u') canonicalSelection = 'Under';
                // BTTS - handle full phrases and abbreviations
                else if (sLower.includes('both teams to score - yes') || sLower.includes('btts - yes') || ['yes', 'gg', 'y', 'btts yes'].includes(sLower)) canonicalSelection = 'Yes';
                else if (sLower.includes('both teams to score - no') || sLower.includes('btts - no') || ['no', 'ng', 'n', 'btts no'].includes(sLower)) canonicalSelection = 'No';
                // Double Chance
                else if (['1x', 'home or draw', 'hd'].includes(sLower) || sLower.includes('1x')) canonicalSelection = '1X';
                else if (['12', 'home or away', 'ha', '1 or 2'].includes(sLower) || sLower.includes('12')) canonicalSelection = '12';
                else if (['x2', '2x', 'draw or away', 'da'].includes(sLower) || sLower.includes('x2')) canonicalSelection = 'X2';
            }

            console.log(`[MAPPING DEBUG] Canonical Selection: "${canonicalSelection}"`);
            console.log(`[MAPPING DEBUG] Target Config Outcomes:`, targetConfig.outcomes);

            if (canonicalSelection && targetConfig.outcomes[canonicalSelection]) {
                targetOutcomeId = targetConfig.outcomes[canonicalSelection];
            } else {
                // Fallback: try raw ID if it happens to match (rare)
                targetOutcomeId = match.selection.id;
                console.log(`[MAPPING DEBUG] Using fallback raw ID: ${targetOutcomeId}`);
            }

            console.log(`[MAPPING DEBUG] Final Target Outcome ID: ${targetOutcomeId}`);

            mapped.push({
                ...match,
                market: {
                    ...match.market,
                    id: targetConfig.marketId,
                    specifier: targetSpecifier
                },
                selection: {
                    ...match.selection,
                    id: targetOutcomeId
                },
                status: 'mapped'
            });
        }

        return mapped;
    }
};
