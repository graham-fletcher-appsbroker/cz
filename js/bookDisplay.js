export class bookDisplay{
    constructor (targetDiv)
    {
        this.targetDiv = targetDiv
    }

    update= (position) =>{
        var html = "<table style='width:100%'>"
        if (position.book_data){
            for (var move of position.book_data.moves){
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
            }
        }   
        html +="</table>"
        $("#"+this.targetDiv).html(html)
    }
}

