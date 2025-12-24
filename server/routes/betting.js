import express from 'express';
const router = express.Router();
import { sportybet } from '../services/sportybet.js';
import { onexbet } from '../services/onexbet.js';
import { bet9ja } from '../services/bet9ja.js';
import { mapping } from '../services/mapping.js';
import { matcher } from '../services/matcher.js';
import db from '../db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

import { authenticateToken } from '../middleware/auth.js';



router.post('/extract', authenticateToken, async (req, res) => {
    // Check if user is premium (any paid plan)
    if (req.user.plan === 'free' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'To use our AI select & split feature you need to be a premium user' });
    }

    const { code, source, region } = req.body;

    try {
        let matches = [];
        if (source === 'SportyBet') {
            matches = await sportybet.extract(code, region);
        } else if (source === '1xBet') {
            matches = await onexbet.extract(code);
        } else if (source === 'Bet9ja') {
            matches = await bet9ja.extract(code);
        } else {
            // Mock others for now
            throw new Error('Bookmaker not supported yet');
        }
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/book', authenticateToken, async (req, res) => {
    // Check if user is premium
    if (req.user.plan === 'free' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'To use our AI select & split feature you need to be a premium user' });
    }

    const { matches, source, region } = req.body;

    try {
        let result;
        if (source === 'SportyBet') {
            result = await sportybet.book(matches, region);
        } else if (source === '1xBet') {
            result = await onexbet.book(matches);
        } else if (source === 'Bet9ja') {
            result = await bet9ja.book(matches);
        } else {
            throw new Error('Bookmaker not supported yet');
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/convert', authenticateToken, async (req, res) => {
    const { code, source, target, region } = req.body;


    try {
        // 1. Extract
        let matches = [];
        if (source === 'SportyBet') {
            matches = await sportybet.extract(code, region);
        } else if (source === '1xBet') {
            matches = await onexbet.extract(code);
        } else if (source === 'Bet9ja') {
            matches = await bet9ja.extract(code);
        } else {
            throw new Error('Source bookmaker not supported');
        }

        if (!matches || matches.length === 0) {
            throw new Error('No matches found in booking code');
        }

        // 2. Match & Map
        let finalMatches = [];
        const sourceMatches = matches;

        // Helper to get target service
        const getService = (name) => {
            if (name === 'SportyBet') return sportybet;
            if (name === '1xBet') return onexbet;
            if (name === 'Bet9ja') return bet9ja;
            return null;
        };

        const targetService = getService(target);

        for (const match of sourceMatches) {
            let targetMatch = null;

            // Attempt to find real event on target bookie
            if (targetService && targetService.findEvent) {
                try {
                    // console.log(`Searching for ${match.home} vs ${match.away} on ${target}...`);
                    targetMatch = await targetService.findEvent(match.home, match.away, match.date);
                } catch (e) {
                    console.warn(`Search failed for ${match.home} vs ${match.away}:`, e.message);
                }
            }

            if (targetMatch) {
                // If found, we use the Target's metadata (GameID) but we still need to Map the Market/Selection
                // We assume targetMatch contains enough info or we merge
                // Actually mapping.convert handles the structure, we just need to inject the "real" target ID if found.

                // For now, if we found a match, we can assume its 'id' is the valid target GameID.
                // We still need to map the Market ID (e.g. 1X2 -> 1X2 ID on Target).

                // Let's use the mapping service but override the ID.
                const mapped = mapping.convert([match], source, target)[0];
                mapped.gameId = targetMatch.id; // Override with real found ID
                mapped.home = targetMatch.home; // Use target names
                mapped.away = targetMatch.away;

                finalMatches.push(mapped);
            } else {
                // FALLBACK POLICY:
                // If we attempted to find an event and failed, we CANNOT just pass the source ID 
                // because it will likely result in "Events Finished" or invalid betslip on Target.
                // We must mark this as failed.

                const mapped = mapping.convert([match], source, target)[0];

                // Only allow fallback if we are confident (e.g. same bookie group, or we know IDs match)
                // For SportyBet <-> 1xBet, IDs definitely do NOT match.

                if (targetService && targetService.findEvent) {
                    mapped.status = 'event_not_found';
                }

                finalMatches.push(mapped);
            }
        }

        let result;
        const allMappedMatches = finalMatches;

        // Filter to only include matches that were successfully found on target bookie
        const validMatches = allMappedMatches.filter(m => m.status !== 'event_not_found' && m.status !== 'unmapped_market' && m.gameId);
        const failedMatches = allMappedMatches.filter(m => m.status === 'event_not_found' || m.status === 'unmapped_market' || !m.gameId);

        console.log(`[CONVERT] Valid matches: ${validMatches.length}, Failed: ${failedMatches.length}`);

        // If no valid matches, return error with details about what failed
        if (validMatches.length === 0) {
            return res.status(422).json({
                error: `Conversion failed: Could not find matching events on ${target}. This may be because ${source} and ${target} use different event ID systems.`,
                total_matches: sourceMatches.length,
                successful_matches: 0,
                failed_selections: failedMatches.map(m => ({
                    match: `${m.home} vs ${m.away}`,
                    reason: m.status === 'event_not_found' ? 'Match not found on target bookie' :
                        m.status === 'unmapped_market' ? 'Market type not supported' : 'Missing event ID'
                }))
            });
        }

        try {
            if (target === 'SportyBet') {
                result = await sportybet.book(validMatches, region);
            } else if (target === '1xBet') {
                result = await onexbet.book(validMatches);
            } else if (target === 'Bet9ja') {
                result = await bet9ja.book(validMatches);
            } else {
                throw new Error('Target bookmaker not supported');
            }
        } catch (bookingError) {
            console.error('Booking failed:', bookingError);
            // Return 422 for mapping/booking logic failures instead of 500
            const errMsg = bookingError.message.toLowerCase();
            if (errMsg.includes('400') || errMsg.includes('invalid') || errMsg.includes('failed')) {
                return res.status(422).json({
                    error: `Conversion failed: Could not map matches to ${target}. The events might not be open on the target bookie, or direct mapping is not supported.`,
                    details: bookingError.message
                });
            }
            throw bookingError; // Rethrow 500s
        }

        // 4. Prepare stats
        let stats = {
            total: sourceMatches.length,
            converted: validMatches.length,
            failed: failedMatches.length
        };

        // 5. Save History
        // Use shareCode as ticket_id (bizCode is just the API status code like 10000)
        const ticketId = result.shareCode || `CVT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;


        // Calculate total odds from valid matches
        const totalOdds = validMatches.reduce((acc, m) => {
            const odds = parseFloat(m.selection?.odds) || 1;
            return acc * odds;
        }, 1).toFixed(2);

        try {
            await db.execute(
                'INSERT INTO split_tickets (user_id, ticket_id, bookmaker, booking_code, total_odds, match_count, ticket_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [req.user.id, ticketId, target, result.shareCode, totalOdds, stats.converted, 'converted']
            );
        } catch (e) {
            console.error('Failed to save conversion history', e);
        }


        // 6. Response
        res.json({
            status: stats.failed > 0 ? 'partial' : 'success',
            data: {
                original_code: code,
                converted_code: result.shareCode,
                stats,
                selections: allMappedMatches,
                failed_selections: failedMatches.map(m => ({
                    match: `${m.home} vs ${m.away}`,
                    reason: m.status === 'event_not_found' ? 'Match not found' :
                        m.status === 'unmapped_market' ? 'Market not supported' : 'Mapping failed'
                }))
            }
        });

    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

// History Routes - Protected
router.post('/save', authenticateToken, async (req, res) => {
    const { ticketId, bookmaker, bookingCode, totalOdds, matchCount, type } = req.body;
    const userId = req.user.id;
    const ticketType = type || 'split'; // Default to 'split' for backward compatibility

    try {
        await db.execute(
            'INSERT INTO split_tickets (user_id, ticket_id, bookmaker, booking_code, total_odds, match_count, ticket_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, ticketId, bookmaker, bookingCode, totalOdds, matchCount, ticketType]
        );
        res.json({ message: 'Ticket saved' });
    } catch (err) {
        console.error('Save Ticket Error:', err);
        res.status(500).json({ error: 'Failed to save ticket' });
    }
});

router.get('/history', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const ticketType = req.query.type; // Optional: 'split', 'converted', or undefined for all

    try {
        let query = 'SELECT * FROM split_tickets WHERE user_id = ?';
        let params = [userId];

        if (ticketType && ['split', 'converted'].includes(ticketType)) {
            query += ' AND ticket_type = ?';
            params.push(ticketType);
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Fetch History Error:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Public community feed - shows recent tickets from all users
router.get('/community', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                st.ticket_id, 
                st.bookmaker, 
                st.booking_code, 
                st.total_odds, 
                st.match_count, 
                st.ticket_type, 
                st.created_at,
                u.username
            FROM split_tickets st
            JOIN users u ON st.user_id = u.id
            ORDER BY st.created_at DESC
            LIMIT 100
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (err) {
        console.error('Fetch Community Tickets Error:', err);
        res.status(500).json({ error: 'Failed to fetch community tickets' });
    }
});

export default router;

