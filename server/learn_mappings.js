import { sportybet } from './services/sportybet.js';
import { onexbet } from './services/onexbet.js';
import { bet9ja } from './services/bet9ja.js';

// Simple argument parser
const args = {};
process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        // Handle --key value or --key=value
        if (value) {
            args[key] = value;
        } else {
            // For boolean flags or if value is next arg (handled simply here assuming value is passed via =)
            // Actually let's just look for next arg if no =
        }
    }
});

// Better parser for "node script.js --sporty CODE --1xbet CODE"
const parsedArgs = {};
for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = process.argv[i + 1];
        if (value && !value.startsWith('--')) {
            parsedArgs[key] = value;
            i++;
        }
    }
}

async function run() {
    const sportyCode = parsedArgs.sporty || parsedArgs.sportybet;
    const onexCode = parsedArgs['1xbet'] || parsedArgs.onex;
    const bet9jaCode = parsedArgs.bet9ja;

    if (!sportyCode && !onexCode && !bet9jaCode) {
        console.log('Usage: node server/learn_mappings.js --sporty <CODE> --1xbet <CODE> --bet9ja <CODE>');
        return;
    }

    const results = {};

    if (sportyCode) {
        try {
            console.log(`Extracting SportyBet code: ${sportyCode}...`);
            const matches = await sportybet.extract(sportyCode);
            results.sporty = matches;
        } catch (e) {
            console.error('SportyBet Error:', e.message);
        }
    }

    if (onexCode) {
        try {
            console.log(`Extracting 1xBet code: ${onexCode}...`);
            const matches = await onexbet.extract(onexCode);
            results.onex = matches;
        } catch (e) {
            console.error('1xBet Error:', e.message);
        }
    }

    if (bet9jaCode) {
        try {
            console.log(`Extracting Bet9ja code: ${bet9jaCode}...`);
            const matches = await bet9ja.extract(bet9jaCode);
            results.bet9ja = matches;
        } catch (e) {
            console.error('Bet9ja Error:', e.message);
        }
    }

    console.log('\n--- EXTRACTION RESULTS ---\n');

    const maxLen = Math.max(
        results.sporty?.length || 0,
        results.onex?.length || 0,
        results.bet9ja?.length || 0
    );

    for (let i = 0; i < maxLen; i++) {
        const s = results.sporty?.[i];
        const o = results.onex?.[i];
        const b = results.bet9ja?.[i];

        console.log(`MATCH ${i + 1}:`);
        console.log('------------------------------------------------');

        if (s) {
            const raw = s.raw || {};
            console.log('\n--- RAW EVENT DUMP ---');
            console.log(JSON.stringify(raw, null, 2));
            console.log('----------------------\n');

            console.log(`[SportyBet]`);
            console.log(`  Match:     ${s.home} vs ${s.away}`);
            console.log(`  Market:    ${s.market.name} (ID: ${s.market.id})`);
            console.log(`  Selection: ${s.selection.name} (ID: ${s.selection.id})`);
            console.log(`  Specifier: ${s.market.specifier || 'None'}`);
        }

        if (o) {
            console.log(`[1xBet]`);
            console.log(`  Match:     ${o.home} vs ${o.away}`);
            console.log(`  Market:    ${o.market.name} (ID: ${o.market.id})`);
            console.log(`  Selection: ${o.selection.name} (ID: ${o.selection.id})`);
            console.log(`  Param:     ${o.raw?.Param || o.raw?.P || 'N/A'}`); // Display raw Param
        }

        if (b) {
            console.log(`[Bet9ja]`);
            console.log(`  Match:     ${b.home} vs ${b.away}`);
            console.log(`  Market:    ${b.market.name} (ID: ${b.market.id})`);
            console.log(`  Selection: ${b.selection.name} (ID: ${b.selection.id})`);
        }

        console.log('\n--- SUGGESTED MAPPING JSON (Partial) ---');
        console.log('{');
        console.log(`  "id": "${s?.market?.id || '(SportsBet_Market_ID)'}",`);
        console.log(`  "name": "${s?.market?.name || '(Market_Name)'}",`);
        console.log('  "values": [');
        console.log('    {');
        console.log(`      "source": "${s?.selection?.name || '(Source_Selection_Name)'}",`);
        console.log(`      "sourceId": "${s?.selection?.id || '(Source_Selection_ID)'}",`);
        console.log('      "targets": {');
        if (o) console.log(`        "1xBet": { "marketId": "${o.market.id}", "outcomeId": "${o.selection.id}" },`);
        if (b) console.log(`        "Bet9ja": { "marketId": "${b.market.id}", "outcomeId": "${b.selection.id}" },`);
        console.log('      }');
        console.log('    }');
        console.log('  ]');
        console.log('}');
        console.log('------------------------------------------------\n');
    }
}

run();
