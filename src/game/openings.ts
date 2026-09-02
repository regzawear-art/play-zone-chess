// Opening detection — matches move sequences to common chess opening names.
// Uses SAN notation strings to identify openings like Chess.com does.

const OPENINGS: { name: string; moves: string[] }[] = [
  { name: "Italian Game: Giuoco Piano", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'] },
  { name: "Italian Game: Two Knights Defense", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
  { name: "Ruy Lopez: Berlin Defense", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'] },
  { name: "Ruy Lopez: Morphy Defense", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'] },
  { name: "Ruy Lopez: Closed", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'] },
  { name: "Sicilian Defense: Open", moves: ['e4', 'c5', 'Nf3', 'Nc6'] },
  { name: "Sicilian Defense: Najdorf", moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  { name: "Sicilian Defense: Dragon", moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
  { name: "French Defense: Advance", moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },
  { name: "French Defense: Exchange", moves: ['e4', 'e6', 'd4', 'd5', 'exd5'] },
  { name: "Caro-Kann Defense: Classical", moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'] },
  { name: "Caro-Kann Defense: Advance", moves: ['e4', 'c6', 'd4', 'd5', 'e5'] },
  { name: "Pirc Defense: Classical", moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'] },
  { name: "Queen's Gambit: Declined", moves: ['d4', 'd5', 'c4', 'e6'] },
  { name: "Queen's Gambit: Accepted", moves: ['d4', 'd5', 'c4', 'dxc4'] },
  { name: "Queen's Gambit: Slav Defense", moves: ['d4', 'd5', 'c4', 'c6'] },
  { name: "King's Indian Defense: Classical", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'] },
  { name: "Nimzo-Indian Defense: Rubinstein", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3'] },
  { name: "Grünfeld Defense: Exchange", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4'] },
  { name: "English Opening: Symmetrical", moves: ['c4', 'c5'] },
  { name: "English Opening: Reversed Sicilian", moves: ['c4', 'e5'] },
  { name: "Réti Opening: Kingside Fianchetto", moves: ['Nf3', 'd5', 'g3'] },
  { name: "King's Indian Attack", moves: ['Nf3', 'g3'] },
  { name: "London System", moves: ['d4', 'd5', 'Bf4'] },
  { name: "Scandinavian Defense: Main Line", moves: ['e4', 'd5'] },
  { name: "Scandinavian Defense: Modern", moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd6'] },
  { name: "Vienna Game", moves: ['e4', 'e5', 'Nc3'] },
  { name: "Scotch Game", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
  { name: "Four Knights Game: Spanish", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5'] },
  { name: "Petrov Defense: Russian", moves: ['e4', 'e5', 'Nf3', 'Nf6'] },
  { name: "Philidor Defense", moves: ['e4', 'e5', 'Nf3', 'd6'] },
  { name: "Dutch Defense: Classical", moves: ['d4', 'f5'] },
  { name: "Bird's Opening", moves: ['f4'] },
  { name: "King's Gambit: Accepted", moves: ['e4', 'e5', 'f4', 'exf4'] },
  { name: "King's Gambit: Declined", moves: ['e4', 'e5', 'f4', 'Bc5'] },
  { name: "Bogo-Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'Bb4+'] },
  { name: "Catalan Opening: Open", moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2'] },
  { name: "Catalan Opening: Closed", moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'Be7'] },
  { name: "Benoni Defense: Modern", moves: ['d4', 'Nf6', 'c4', 'c5'] },
  { name: "Benko Gambit", moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'] },
  { name: "Owen's Defense", moves: ['e4', 'b6'] },
  { name: "Modern Defense", moves: ['e4', 'g6'] },
  { name: "Alekhine's Defense", moves: ['e4', 'Nf6'] },
  { name: "Nimzowitsch Defense", moves: ['e4', 'Nc6'] },
];

export function getOpeningName(sans: string[]): string {
  let best: { name: string; len: number } = { name: '', len: 0 };
  for (const opening of OPENINGS) {
    if (opening.moves.length > sans.length) continue;
    let match = true;
    for (let i = 0; i < opening.moves.length; i++) {
      if (sans[i] !== opening.moves[i]) { match = false; break; }
    }
    if (match && opening.moves.length > best.len) {
      best = { name: opening.name, len: opening.moves.length };
    }
  }
  return best.name;
}
