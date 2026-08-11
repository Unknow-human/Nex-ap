/**
 * ⚠️ OBSOLÈTE — Ne plus déployer.
 *
 * Ces Cloud Functions Firebase interrogeaient la collection Firestore
 * "records", qui n'existe plus : l'app (src/) est passée à Supabase/Postgres
 * (voir ../supabase/schema.sql). Plus aucun appel à ces fonctions
 * n'existe dans src/ — elles sont mortes côté app mobile/RN.
 *
 * Les équivalents vivent maintenant directement dans Postgres, appelables
 * via supabase.rpc(...) sans couche serverless :
 *   getTopRecords      -> rpc('get_top_records', { p_limit })
 *   getPlayerStats      -> rpc('get_player_stats', { p_agent_name })
 *   getDifficultyStats  -> rpc('get_difficulty_stats')
 *   getGlobalStats      -> rpc('get_global_stats')
 *   saveGameRecord      -> insert direct dans la table `records`
 *     (RLS: "Seul l'auteur peut créer son propre record")
 *
 * Seule public/game-web-complete.html appelle encore saveGameRecord
 * (via firebase.functions()) — cette page n'a pas encore été migrée
 * vers Supabase, voir la feuille de route.
 *
 * Ce fichier est conservé pour référence le temps de finaliser cette
 * migration, puis à supprimer avec le reste du dossier functions/.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ============= AGGREGATION FUNCTIONS =============

/**
 * Get top records with aggregation
 * Returns top 10 players by shortest game time
 */
exports.getTopRecords = functions.https.onCall(async (data, context) => {
    try {
        const limit = data.limit || 10;
        
        // Using aggregation query
        const result = await db.collection('records').aggregate([
            { $sort: { time: 1 } },  // Sort by time ascending (fastest first)
            { $limit: limit },
            { $project: {
                agentName: 1,
                time: 1,
                difficulty: 1,
                platform: 1,
                createdAt: 1
            }}
        ]).get();

        const records = [];
        result.forEach(doc => {
            records.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            success: true,
            data: records,
            count: records.length
        };
    } catch (error) {
        console.error('❌ Error in getTopRecords:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

/**
 * Get player statistics
 * Returns aggregated stats for a specific player
 */
exports.getPlayerStats = functions.https.onCall(async (data, context) => {
    try {
        const playerName = data.playerName;
        
        if (!playerName) {
            return { success: false, error: 'playerName required' };
        }

        // Count games won
        const winCount = await db.collection('records')
            .where('agentName', '==', playerName)
            .count()
            .get();

        // Get best time
        const bestTime = await db.collection('records')
            .where('agentName', '==', playerName)
            .orderBy('time', 'asc')
            .limit(1)
            .get();

        // Calculate average time
        const allTimes = await db.collection('records')
            .where('agentName', '==', playerName)
            .get();

        let avgTime = 0;
        if (allTimes.size > 0) {
            const total = allTimes.docs.reduce((sum, doc) => sum + (doc.data().time || 0), 0);
            avgTime = Math.round(total / allTimes.size);
        }

        return {
            success: true,
            data: {
                playerName,
                totalGames: winCount.data().count,
                bestTime: bestTime.size > 0 ? bestTime.docs[0].data().time : null,
                averageTime: avgTime
            }
        };
    } catch (error) {
        console.error('❌ Error in getPlayerStats:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

/**
 * Get difficulty statistics
 * Returns aggregated stats by difficulty level
 */
exports.getDifficultyStats = functions.https.onCall(async (data, context) => {
    try {
        const difficulties = ['BEGINNER', 'NORMAL', 'HARD', 'NIGHTMARE'];
        const stats = {};

        for (const difficulty of difficulties) {
            const result = await db.collection('records')
                .where('difficulty', '==', difficulty)
                .aggregate([
                    { $group: {
                        _id: difficulty,
                        count: { $sum: 1 },
                        avgTime: { $avg: '$time' }
                    }}
                ])
                .get();

            if (result.size > 0) {
                const data = result.docs[0].data();
                stats[difficulty] = {
                    games: data.count,
                    averageTime: Math.round(data.avgTime || 0)
                };
            } else {
                stats[difficulty] = { games: 0, averageTime: 0 };
            }
        }

        return {
            success: true,
            data: stats
        };
    } catch (error) {
        console.error('❌ Error in getDifficultyStats:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

/**
 * Save game record
 * Called after player completes a game
 */
exports.saveGameRecord = functions.https.onCall(async (data, context) => {
    try {
        const { agentName, time, difficulty, platform, mode } = data;

        if (!agentName || !time) {
            return { success: false, error: 'agentName and time required' };
        }

        const recordRef = await db.collection('records').add({
            agentName,
            time,
            difficulty: difficulty || 'NORMAL',
            platform: platform || 'web',
            mode: mode || 'SOLO',
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        });

        return {
            success: true,
            recordId: recordRef.id,
            message: `✅ Record saved for ${agentName}`
        };
    } catch (error) {
        console.error('❌ Error in saveGameRecord:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

/**
 * Get global statistics
 * Returns overall game statistics
 */
exports.getGlobalStats = functions.https.onCall(async (data, context) => {
    try {
        // Total games played
        const totalGames = await db.collection('records').count().get();

        // Games by platform
        const webGames = await db.collection('records')
            .where('platform', '==', 'web')
            .count()
            .get();

        const mobileGames = await db.collection('records')
            .where('platform', '==', 'mobile')
            .count()
            .get();

        // Average game time
        const allRecords = await db.collection('records').get();
        let avgTime = 0;
        if (allRecords.size > 0) {
            const total = allRecords.docs.reduce((sum, doc) => sum + (doc.data().time || 0), 0);
            avgTime = Math.round(total / allRecords.size);
        }

        return {
            success: true,
            data: {
                totalGames: totalGames.data().count,
                webGames: webGames.data().count,
                mobileGames: mobileGames.data().count,
                globalAverageTime: avgTime,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('❌ Error in getGlobalStats:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

console.log('🚀 NEXUS ARENA Cloud Functions v1.0.1 initialized');
