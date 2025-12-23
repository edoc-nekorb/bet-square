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

            // Identify standard market type from source name
            if (mName.includes('1x2') || mName.includes('winner') || mName.includes('match') || mName === '1' || mName === '1x2') marketType = '1X2';
            else if (mName.includes('over') || mName.includes('under') || mName.includes('total')) marketType = 'Over/Under';
            else if (mName.includes('double') || mName.includes('chance')) marketType = 'Double Chance';
            else if (mName.includes('both') || mName.includes('goal') || mName.includes('btts') || mName.includes('gg')) marketType = 'Both Teams To Score';

            if (!marketType || !marketMappings[marketType]) {
                // Return generic match structure but mark as failed mapping internally if needed?
                // For now, pass through what we have, maybe it works by luck or robust backend on target.
                mapped.push({ ...match, status: 'unmapped_market' });
                continue;
            }

            const mappingConfig = marketMappings[marketType];
            const targetConfig = mappingConfig[targetKey];
            const sourceConfig = mappingConfig[sourceKey];

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

            // For Over/Under markets, extract the goal line from selection name
            // e.g., "Total Over (1.5)" or "Over 2.5" should generate specifier "total=1.5" or "total=2.5"
            if (marketType === 'Over/Under' && targetKey === 'sportybet') {

                console.log(`[MAPPING DEBUG] Over/Under market detected - source specifier: "${targetSpecifier}"`);
                const goalLineMatch = selectionName.match(/(\d+\.?\d*)/);
                if (goalLineMatch) {
                    targetSpecifier = `total=${goalLineMatch[1]}`;
                    console.log(`[MAPPING DEBUG] Generated specifier for Over/Under: ${targetSpecifier}`);
                }
            }



            // DEBUG LOGGING
            console.log(`[MAPPING DEBUG] Match: ${match.home} vs ${match.away}`);
            console.log(`[MAPPING DEBUG] Market: ${match.market.name} (ID: ${match.market.id}), MarketType: ${marketType}`);
            console.log(`[MAPPING DEBUG] Selection Name: "${selectionName}", Selection ID: ${selectionId}`);

            // Simple map override based on known names
            // This is "Selection Normalization" logic
            let canonicalSelection = null;

            if (sourceConfig && sourceConfig.outcomes) {
                // Try to find key by value or key match
                // Actually sourceConfig.outcomes values are IDs. Keys are Names.
                // We have the Name (or sometimes ID depending on extraction).
                // Let's assume selectionName is the Name like "Home", "1", "Over"

                // Fuzzy check keys
                const sName = selectionName.toLowerCase();
                for (const [key, val] of Object.entries(sourceConfig.outcomes)) {
                    if (sName === key.toLowerCase() || sName === val.toString().toLowerCase()) {
                        canonicalSelection = key;
                        break;
                    }
                }
            }

            // Fallback Normalization - handle all common formats
            if (!canonicalSelection) {
                const sLower = selectionName.toLowerCase().trim();
                // 1X2 Market
                if (['1', 'home', 'w1', 'h', '1.0'].includes(sLower)) canonicalSelection = 'Home';
                else if (['2', 'away', 'w2', 'a', '2.0'].includes(sLower)) canonicalSelection = 'Away';
                else if (['x', 'draw', 'd', '0'].includes(sLower)) canonicalSelection = 'Draw';
                // Over/Under
                else if (sLower.includes('over') || sLower === 'o') canonicalSelection = 'Over';
                else if (sLower.includes('under') || sLower === 'u') canonicalSelection = 'Under';
                // BTTS - handle full phrases and abbreviations
                else if (sLower.includes('both teams to score - yes') || sLower.includes('btts - yes') || ['yes', 'gg', 'y', 'btts yes'].includes(sLower)) canonicalSelection = 'Yes';
                else if (sLower.includes('both teams to score - no') || sLower.includes('btts - no') || ['no', 'ng', 'n', 'btts no'].includes(sLower)) canonicalSelection = 'No';
                // Double Chance
                else if (['1x', 'home or draw', 'hd'].includes(sLower)) canonicalSelection = '1X';
                else if (['12', 'home or away', 'ha', '1 or 2'].includes(sLower)) canonicalSelection = '12';
                else if (['x2', '2x', 'draw or away', 'da'].includes(sLower)) canonicalSelection = 'X2';
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
