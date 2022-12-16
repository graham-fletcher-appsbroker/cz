import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.js";
import {ObjectEvent} from "./objectEvent.js"
import {chessPosition} from "./chessPosition.js"
import {md5} from "./md5.min.js"
import { M } from "./chart/dist/chunks/helpers.segment.js";


export class chessGame extends ObjectEvent{
    constructor(PGN){
        super()
        this.new_event("analysis_update")
        this.new_event("analysis_complete")
        this.new_event("move_selected")
        this.short_eva_depth = 9
        this.full_eva_depth  = 16
        this.id=md5(PGN)
        
        var ch = new Chess()

        if(!ch.load_pgn(PGN))
            throw("PGN is not valid")

        this.positions=[]

        //While there are unprocessed moves
        
        var d = true
        while(d)
        {
            this.positions= [new chessPosition(
                ch,
                this.positions,
                this
            )]
            if (ch.history().length==0)
                d = false
            else
                ch.undo()
        }

        

        //Keep an array of the main line
        this.main_line=[]
        var m = this.positions[0]
        while(m){
            this.main_line.push(m)
            m = m.next()
        }

        

        
    }


    last = () =>{
        //Return's the last position in the main line
        var p = this.positions[0]
        while(p.next())
            p = p.next()
        return p
    }

    analyse = (anal_pos = null) =>{

        if (!this.engine){
            this.engine = new Worker('stockfish.js');
            this.engine.onmessage = this.engine_message
        }

        this.anal_pos = (anal_pos ? anal_pos : this.last())
        
        
        var depth = 0
        if (this.anal_pos.grade != "Book")
        {
            if (!this.anal_pos.short_eva)
                depth = this.short_eva_depth
            if (!this.anal_pos.full_eva)
                depth = this.full_eva_depth
        }
        if (depth >0)
        {
            this.engine.postMessage("position fen " + this.anal_pos.fen);
            this.engine.postMessage("go depth "+String(depth));
        }
        else
        {
            if (this.anal_pos.previous())
                this.analyse(this.anal_pos.previous())
            else{
                this.engine.terminate()
                this.engine=null
            }
        }
    }

    report = (div_id=null) =>{

        //Count the number of moves at each grade
        var counts={}
        for (var gr of chessPosition.grades)
            counts[gr]=new Array(2).fill(0)
        
        for (var m of this.main_line)
            counts[m.grade][m.turn=="w"?0:1]+= 1    
        
           
        //Build the report
        var ret_value="<div style='display:flex; flex-direction: column; justify-content: center;'><h2 class='report_title'>Game Analysis</h2>"
        ret_value+="<table>"
        for (var grade of chessPosition.grades)
            if (grade != "OK")
                ret_value += "<tr><td class='"+grade+" report_value'><span class='move_count "+grade+"'>"+counts[grade][1]+"</span></td><td class='"+grade+" report_centre_title'>"+grade+"</td><td class='"+grade+" report_value'>"+counts[grade][0]+"</td></tr>"
    
        ret_value+"</table>"
        ret_value+="</div>"

        if(div_id){
            $("#"+div_id).html(ret_value)
        }
        return ret_value
    }

    controls = (div_id=null)=>{
        var ret_value = "<div id='"+this.id+"_controls' "+"class='chessGameControls'>"
        ret_value+= "<div class='button' action='first' />&laquo;</div>"
        ret_value+= "<div class='button' action='previous' />&#8249;</div>"
        ret_value+= "<div class='button' action='next' />&#8250;</div>"
        ret_value+= "<div class='button' action='last' />&raquo;</div>"
        ret_value+="</div>"

        //If a divid was provided then add the html and listen
        if(div_id){
            $("#"+div_id).html(ret_value)

            $('#'+this.id+"_controls").find(".button").on("click",this.controlClicked)
            
          
        }

        return ret_value
    }
    

    html = (div_id=null)=>{
        var ret_value = "<div id='"+this.id+"_text' "+"class='chessGameHTML'>"
        var last_comment = false
        for (var m of this.main_line){
            ret_value += m.html(last_comment?2:1, m == this.selected_move)+"&nbsp"
            if (m.turn=="w" && m.previous())
                ret_value+="&nbsp"
            last_comment = (m.comment != "")
        }
        ret_value+="</div>"

        //If a divid was provided then add the html and listen
        if(div_id){
            $("#"+div_id).html(ret_value)
            $('#'+this.id+"_text").find('.move').on("click",this.moveClicked)
        }
        
        return ret_value
    }

    listen = () =>{
        //Event listeners cant be added until after HTML has been added to the document. Therefore
        //We have to create a listen method to allow the page to start listenening after update is complete
        $('#'+this.id+"_text").find('.move').on("click",this.moveClicked)
        $('#'+this.id+"_controls").find('.control_button').on("click",this.controlClicked)
    }

    moveClicked = (evt) => {
        this.select(evt.target.id)
    }

    controlClicked = (evt) => {
        this.selectMove($(evt.target).attr("action"))
        evt.stopPropagation();
    }

    select = (moveId) => {
        //Highlight the correct move
        $('#'+this.id+"_text").find('.move.selected').removeClass('selected')
        $('#'+moveId).addClass('selected')

        //Find the move
        if (!this.selected_move || this.selected_move.id != moveId)
            for(var move of this.main_line){
                if (move.id == moveId)
                {
                    this.selected_move = move
                    this.throw("move_selected",this.selected_move)
                    break;
                }
            }        
    }

    selectMove = (what) =>
    {
        
        
        switch (what){
            case "first" : 
                this.select( this.positions[0].id )
                break;
            case "last" :
                this.select( this.last().id )
                break;
            case "next" :
                if (this.selected_move)
                    if (this.selected_move.next())
                        this.select( this.selected_move.next().id )
                break;
            case "previous" :
                if (this.selected_move)
                    if (this.selected_move.previous())
                        this.select( this.selected_move.previous().id )
                break
        }
    }

    engine_message = (event) =>{
        var line;
        var match;
        
        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }

        /// Is it sending feed back with a score?
        if(match = line.match(/^info depth (\d+).*\bscore (\w+) (-?\d+).*\bpv (\w+)/)) {
            var score = parseInt(match[3]) * (this.anal_pos.turn == 'w' ? 1 : -1);
            /// Is it measuring in centipawns?
            if(match[2] == 'mate') {
                if (score==0)
                    score = 10000 * (this.anal_pos.turn == 'w' ? 1 : -1)
                else
                    score = 10000* Math.sign(score) 
            }

          
            this.anal_pos.short_eva[parseInt(match[1])] = score 
            this.anal_pos.best_short_move[parseInt(match[1])]=match[4]
            

            if (match[1] == String(this.full_eva_depth))
            {
                this.anal_pos.full_eva=score
                this.anal_pos.best_full_move=match[4]
                this.anal_pos.grade_move()
                for (var next_move of this.anal_pos.nextPositions)
                    next_move.grade_move()
            }
        }
    
        /// is the analysis done
        if(match = line.match(/^bestmove .*?/)) {
            this.throw("analysis_update", this.anal_pos )
            if (this.anal_pos.previous())
            {
                this.analyse(this.anal_pos.previous())
            }   
            else{
                this.throw("analysis_complete", {})
                this.engine.terminate()
                this.engine=null
            }
        }

            
    }
}