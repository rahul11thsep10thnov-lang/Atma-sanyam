// Chess tactic puzzles: position (FEN), the side to move, and the winning
// move(s). Positions are classic textbook patterns, not from any proprietary
// database. "Mate in 1" puzzles are verified by the engine (outcome ===
// checkmate after the move); "win material" puzzles list the best capture.
export interface ChessPuzzle {
  fen: string;
  solution: string[]; // moves in from-to algebra, e.g. 'h5f7'; the player plays the first, (optional) reply and second
  theme: string;
  hint: string;
}

export const PUZZLES: Record<string, ChessPuzzle[]> = {
  easy: [
    { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['h5f7'], theme: 'Scholar\'s mate', hint: 'The queen and bishop both look at f7.' },
    { fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', solution: ['a1a8'], theme: 'Back-rank mate', hint: 'The black king cannot escape its own pawns.' },
    { fen: '4k3/8/8/8/8/8/3r1PPP/3Q2K1 w - - 0 1', solution: ['d1d2'], theme: 'Win a rook', hint: 'A rook has wandered next to your queen with nobody guarding it.' },
    { fen: 'k7/pp6/8/8/8/8/8/K5R1 w - - 0 1', solution: ['g1g8'], theme: 'Back-rank mate', hint: 'Slide the rook to the eighth rank.' },
    { fen: '7k/6pp/8/8/8/8/8/K2Q4 w - - 0 1', solution: ['d1d8'], theme: 'Back-rank mate', hint: 'The queen checks on the last rank.' },
    { fen: '6k1/ppp2ppp/8/8/8/8/PPP2PPP/4R1K1 w - - 0 1', solution: ['e1e8'], theme: 'Back-rank mate', hint: 'Nothing defends the back rank.' },
  ],
  normal: [
    { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3', solution: ['e5d4'], theme: 'Win a pawn', hint: 'A free pawn in the centre.' },
    { fen: 'rnbqkb1r/ppp2ppp/5n2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 4', solution: ['c3d5'], theme: 'Win a pawn', hint: 'Count the attackers on d5.' },
    { fen: 'r1b2rk1/ppp2ppp/2n5/3n4/8/5N2/PP2PPPP/RNBQ1RK1 w - - 0 1', solution: ['d1d5'], theme: 'Win a piece', hint: 'The knight on d5 has no defender.' },
    { fen: '2k5/pppp4/8/8/8/8/PPP5/2K1R3 w - - 0 1', solution: ['e1e8'], theme: 'Back-rank mate', hint: 'The king is boxed in by its own pawns.' },
    { fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', solution: ['a1a8'], theme: 'Fork of rook and king', hint: 'Check on the eighth rank wins the rook on h8.' },
  ],
  hard: [
    { fen: '2r3k1/5ppp/8/8/8/8/5PPP/1Q2R1K1 w - - 0 1', solution: ['b1b8'], theme: 'Deflection: mate in 2', hint: 'Offer the queen so the rook leaves the back rank; then your rook mates.' },
    { fen: 'r1b1kb1r/pppp1ppp/2n2q2/4n3/2B1P3/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 1', solution: ['c4f7'], theme: 'Bishop sacrifice', hint: 'Bxf7+ drags the king out.' },
    { fen: '7k/6p1/5N2/8/8/8/6K1/R7 w - - 0 1', solution: ['a1h1'], theme: 'Arabian mate', hint: 'The knight covers the king\'s escape squares; bring the rook to the h-file.' },
  ],
};
