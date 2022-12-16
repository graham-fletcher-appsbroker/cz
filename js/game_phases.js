export function game_phase(board){
    if (count_mm(board) < 6){
        return 2
    }

    if (count_mm(board)< 10 || count_backrow(board)<4 || count_captures(board)>4){
        return 1
    }
    return 0
}
export function count_captures (game){
    var capture_count = 0
    for (const possible_move of game.moves({ verbose: true })) {
        if (possible_move.flags.indexOf("e") > -1  || possible_move.flags.indexOf("c") > -1){
            capture_count+= 1
        }
    }
    return capture_count
}

export function count_mm (game){
    var fen=game.fen()
    var board=fen.substr(0,fen.indexOf(" "))
    return mm_w(board)+mm_b(board)
}

export function count_backrow (game){
    var fen=game.fen()
    var board=fen.substr(0,fen.indexOf(" ")).split("/")
    return Math.min(mm_w(board[7]),mm_b(board[0]))
}

function mm_w(st){
    return  (st.match(/R/g) || []).length +
    (st.match(/N/g) || []).length +
    (st.match(/B/g) || []).length +
    (st.match(/Q/g) || []).length 
}
function mm_b(st){
    return  (st.match(/r/g) || []).length +
    (st.match(/n/g) || []).length +
    (st.match(/b/g) || []).length +
    (st.match(/q/g) || []).length 
}

