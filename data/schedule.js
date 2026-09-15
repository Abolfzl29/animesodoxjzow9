/*
 * Single source of truth for the weekly broadcast schedule.
 * Loaded as a plain script -> exposes window.NEON_SCHEDULE_DATA.
 *
 * Used by BOTH the homepage widget (script.js) and the full schedule
 * page (schedule.js) so they can never disagree again.
 *
 * Entry shape:
 *   { day: 'sat'|'sun'|'mon'|'tue'|'wed'|'thu'|'fri',
 *     animeId: <id from data/anime.js>, ep: <number>,
 *     time: 'HH:MM' (24h, Tehran time), lang: 'dub'|'sub'|'both',
 *     vip: <optional bool> }
 *
 * Demo data keyed by real ids from data/anime.js — replace with a real
 * API feed when the backend exists.
 */
(function () {
    'use strict';

    var SCHEDULE = [
        { day: 'sat', animeId: 'one-piece', ep: 1118, time: '20:00', lang: 'sub' },
        { day: 'sat', animeId: 'attack-on-titan', ep: 22, time: '22:30', lang: 'dub', vip: true },
        { day: 'sun', animeId: 'demon-slayer', ep: 12, time: '19:00', lang: 'dub' },
        { day: 'sun', animeId: 'chainsaw-man', ep: 9, time: '21:30', lang: 'sub' },
        { day: 'mon', animeId: 'jujutsu-kaisen', ep: 15, time: '20:30', lang: 'both' },
        { day: 'mon', animeId: 'cyberpunk-edgerunners', ep: 5, time: '23:00', lang: 'sub' },
        { day: 'tue', animeId: 'death-note', ep: 10, time: '18:30', lang: 'dub' },
        { day: 'tue', animeId: 'one-piece', ep: 1119, time: '21:00', lang: 'sub' },
        { day: 'wed', animeId: 'demon-slayer', ep: 13, time: '20:00', lang: 'sub' },
        { day: 'wed', animeId: 'attack-on-titan', ep: 23, time: '22:15', lang: 'both' },
        { day: 'thu', animeId: 'jujutsu-kaisen', ep: 16, time: '19:30', lang: 'sub' },
        { day: 'thu', animeId: 'chainsaw-man', ep: 10, time: '22:00', lang: 'dub' },
        { day: 'fri', animeId: 'cyberpunk-edgerunners', ep: 6, time: '17:00', lang: 'both' },
        { day: 'fri', animeId: 'death-note', ep: 11, time: '20:30', lang: 'sub' }
    ];

    window.NEON_SCHEDULE_DATA = SCHEDULE;
})();
