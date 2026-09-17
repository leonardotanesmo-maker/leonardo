// Leonardo – konfigurasjon av duell-reléet.
//
// Når siden kjører fra server.js (lokalt eller på en Node-host) finnes reléet
// på samme adresse, og da brukes det automatisk – denne filen kan stå tom.
//
// Når siden ligger på en ren statisk host (for eksempel GitHub Pages) finnes
// det ingen server. Lim da inn adressen til en liten Leonardo-server du har
// satt opp et annet sted (f.eks. Render/Railway). Da kobler duellen seg dit,
// og virker uansett hvilket nett spillerne er på.
//
// Sett den til grunnadressen eller til hele relé-stien. Begge virker:
//   window.LEONARDO_RELAY_URL = 'https://leonardo-duel.onrender.com';
//   window.LEONARDO_RELAY_URL = 'wss://leonardo-duel.onrender.com/api/duel';
//
// Tom streng = bruk samme adresse som siden (server.js) og ellers P2P-reserve.
window.LEONARDO_RELAY_URL = '';
