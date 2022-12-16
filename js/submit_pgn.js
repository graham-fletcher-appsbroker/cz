


import {analysisBoard} from "./analysisBoard.js"








var analysis
export async function lichess(key){
    var response = await fetch('https://lichess.org/game/export/'+key);
    var PGN = await response.text()

    analysis=new analysisBoard(PGN,"board","moves",null,"report","graph","book")
}

/*

export async function chessdotcom(key){
    var response = await fetch('https://lichess.org/game/export/'+key);
    var PGN = await response.text()
    console.log(PGN)
    var game = new Chess()
    if (game.load_pgn(PGN)){
        new analysis(PGN,"eval_graph",18,7,analysis_graph_click,"report")
    }
}

function analysis_graph_click(fen,move){
    var squareClass = 'square-55d63'
    board.position(fen)
    if (move){
        console.log(move.from,move.to)
        $board.find('.' + squareClass).removeClass('highlight_square')
        $board.find('.square-' + move.from).addClass('highlight_square')
        $board.find('.square-' + move.to).addClass('highlight_square')
    }

    document.dispatchEvent(new CustomEvent("book_update", { detail:{"fen": fen }}));
}
*/
lichess(key)
 
/*
document.addEventListener("book_update", async (e) => {
    var response = await fetch('https://explorer.lichess.ovh/masters?variant=standard&fen='+encodeURIComponent(e.detail.fen));
    var json = await response.json()
    var html = "<table style='width:100%'>"
    for (var move of json.moves){
        html += "<tr><td style='width:10%'>"+move.san+"</td><td style='width:10%'>"+(move.white+move.black+move.draws)+"</td>"
        html += "<td style='width:80%'>"
        if (move.white+move.black+move.draws > 0){
            var wp=Math.round(100*move.white/(move.white+move.black+move.draws))
            var dp=Math.round(100*move.draws/(move.white+move.black+move.draws))
            var bp=Math.round(100*move.black/(move.white+move.black+move.draws))

            html +=     '<div style="display:flex;">'
            html +=         '<div style="width: '+100*move.white/(move.white+move.black+move.draws)+'%; background: white;">'+(wp>5?wp:"")+'</div>'
            html +=         '<div style="width: '+100*move.draws/(move.white+move.black+move.draws)+'%; background: grey;">'+(dp>5?dp:"")+'</div>'
            html +=         '<div style="width: '+100*move.black/(move.white+move.black+move.draws)+'%; background: black; font-color:white">'+(bp>5?bp:"")+'</div>'
            html +=     '</div>'
        }
        html += '</td>'
        html+="</tr>"
        console.log(move)
    }
    html +="</table>"
    book.html(html)
})    
*/
