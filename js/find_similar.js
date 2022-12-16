export function describe_position(game){
    var ret_value=""
    var board=game.board().flat().filter(n => n)
   

    //Start by describing the pawn structure
    for ( var v of board) {
        if (v.type == "p"){
            ret_value += v.square+v.color+"p "
        }
    }

    ret_value += ret_value

    //Then describe the Material
    for ( v of board){
        if (v.type != "p"){
            if (v.type != "b"){
                ret_value += v.color+v.type+" "
            }
            else
            {
                //Bisops are light or dark squared
                var ld = ((v.square.charCodeAt(0)-'a'.charCodeAt(0))+(v.square[1]-"1"))%2
                ret_value += v.color+v.type+(ld==0?"D":"L")+" "
            }
        }
    }
    return ret_value
}



