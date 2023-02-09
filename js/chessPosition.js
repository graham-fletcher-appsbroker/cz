import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.js";
import {ObjectEvent} from "./objectEvent.js"
import {md5} from "./md5.min.js"
import {chessEngine,analysis} from "./chessEngine.js"
export function p(score){
    return 1.0/(1.0+Math.exp(-0.004*score))
}

export function q(p) {
    return Math.log((1-p)/p) / (-0.004)
}

const eval_db_request = window.indexedDB.open("eval_db", 1);
eval_db_request.onerror = (event) => {
    chessPosition.eval_db = null
};
eval_db_request.onsuccess = (event) => {
    chessPosition.eval_db = event.target.result;
};
eval_db_request.onupgradeneeded = (event) => {
    // Save the IDBDatabase interface
    event.target.result.createObjectStore("pos_eval", { keyPath: "fen" });
};

export class chessPosition extends ObjectEvent {
    static grades = ["Brillient","Exellent","Great","Best","Good","OK","Book","Inaccuracy","Mistake","Blunder",]
    static eval_db = null

    constructor(ch,nextPositions=[],game){
        super()
        
        this.fen = ch.fen()
        this.rawMove = ch.history({ verbose: true }).pop() 
        this.move = (this.rawMove?this.rawMove.san:null)
        this.moveA = (this.rawMove?this.rawMove.from+this.rawMove.to:null)
        this.turn = ch.turn()
        this._full_eva = null
        this.short_eva = []
        this.best_short_move=[]
        this.best_full_move=""
        this.game=game
        this.grade="OK"
        this.id=md5(this.fen+String(ch.history().length)+this.move+this.game.id)

        this.new_event("grade_changed")
        this.new_event("eval_changed")
    

        //Remove [% ] from the comment
        if (ch.get_comment()){
            for (var data of  ch.get_comment().match(/\[[^\]]*]/g))
            {
                var v
                if (v = data.match(/^\[\%eval (.*)].*/))
                {
                    //this.full_eva = parseFloat(v[0].substring(6, v[0].length-1))
                }
            }
            this.comment = ch.get_comment().replace(/\[[^\]]*]/g,"").trim()
        }
        else
            this.comment=""

        //Create a double linked tree of positions
        this.nextPositions=nextPositions
        for ( var p of this.nextPositions)
            p.parent = this
        this.parent = null

        //Get any book data
        this.book=null
        fetch('https://explorer.lichess.ovh/masters?variant=standard&fen='+encodeURIComponent(this.fen)).then(this.book_query_responce);
       
    }

    book_query_responce= async (result)=>
    {
        if (result.status && result.status==200)
        {
            var r = await result.json()
            var cnt = r.white+r.draws+r.black
            if(cnt > 10){
                this.grade = "Book"
                this.book  =r
                var p =(r.white + (r.draws/2))/cnt
                this.full_eva = q(p)
                this.book_data = r
            }
        }
    }

    set full_eva (v) {
        this._full_eva= v
        this.throw("eval_changed",this)
    }

    get full_eva () {
        return this._full_eva
    }

    descriptor = () =>
    {
        var mn = this.move_number()
        if (mn==0)
            return ""
        else
            return String(mn)+(this.turn=="w"?" ...":" ")+this.move
    }

    html = (number_type, selected_move)=>{
        //number type    0) Dont number    1)  Only number if white  "Normal mode"   2) Always number. Usead if the previous move had a comment
        if (this.previous())
        {
            var ret_value = "<span class='chess_position'>"
            if (number_type > 2 || (number_type==1 && this.turn=="b"))
                ret_value += "<span class='number "+this.grade+"'>"+this.move_number()+"</span>"+
                "<span class='dots "+this.grade+"'>" + (this.turn == "w" ? " ... " : " ")+ "</span>"

            ret_value +=   "<span id='"+this.id+"' class='move "+this.grade+(selected_move?" selected":"")+"'>"+ this.move+" "+"</span>"+
                            "<span class='comment "+this.grade+"'>"+this.comment+"</span>"
            ret_value +="</span>"
            return ret_value
        }
        else
        {
            //Positions witout a previous dont have a move to get here so dont appear in the html
            return ""
        }
    }

    next = ()=>{
        // Get the next position on the main line
        if (this.nextPositions.length > 0)
            return this.nextPositions[0]
        else
            return null
    }

    previous = ()=>{
        //Get the previous postion
        return this.parent
    }

    sidelines = () => {
        //Return an array of sidelines
        return this.nextPositions.slice(1)
    }

    move_number = () =>
    {
        var c = (this.turn == "w"? 0 : 1)
        var m = this
        while(m.previous()){
            c+=1
            m=m.previous()
        }
        return c/2
    }

    analyse = (depth,en) => {
        
            var an = new analysis(this.fen,depth).run_p(en).then(()=>{

                for (var r of an.result)
                {   
                    console.log(r,this.short_eva)

                    this.short_eva[parseInt(r.depth)] = r.score * (this.turn == "w" ? 1:-1)
                    this.best_short_move[parseInt(r.depth)]=r.bestmove
                
                    if(!this.book)
                        this.full_eva=r.score * (this.turn == "w" ? 1:-1)
                    this.best_full_move=r.bestmove
                
                }
                //this.throw("eval_changed")   
                this.grade_move()
                var nm = this.next()
                if(nm)
                    nm.grade_move()
            })
        
    }

    grade_move = () => {
        console.log("------------------")
        console.log("grade",this.moveA)

        if (this.grade!="Book" && this.parent && this.parent.full_eva != null && this.parent.short_eva != null) {
            var count = 0;

                for (var x of this.parent.best_short_move)
                    if (x == this.parent.best_full_move)
                        count ++
            

            var difficulty = (this.parent.best_short_move.length - 1 - count*1.0 ) / (this.parent.best_short_move.length - 1)
            this.difficulty = difficulty

            console.log(this.parent.best_full_move,this.parent.best_short_move)

            var old_grade = this.grade

            var grades_by_analysis = [      ["Exellent","Exellent","Brillient","Brillient","Brillient"]  ,               //MOves that imporve the analysis a lot,
                                            ["Great","Great","Exellent","Brillient","Brillient"]  ,               //MOves that imporve the analysis,
                                            ["OK","Best","Great","Exellent","Brillient"]  ,               //Best move acoring to full analysis,
                                            ["Inaccuracy","OK","Good","Good","Good"],                             //<0.05 drop according to full analysis
                                            ["Mistake","Inaccuracy","Inaccuracy","Inaccuracy","OK"],    //<0.10 drop according to full analysis
                                            ["Blunder","Mistake","Mistake","Mistake","Inaccuracy"],  //<0.20 drop according to full analysis
                                            ["Blunder","Blunder","Blunder","Blunder","Mistake"]]

        
            
            //Calulate the change in eval due to the move w.r.s.t. the person making the move
            var full_eval_diff = p(this.full_eva)-p(this.parent.full_eva) 
            console.log(full_eval_diff)
            
            
            
            if (this.turn=="w"){
                full_eval_diff = -full_eval_diff
            }

            //Identify which line of grading based on the full analysis delta
            var grades_array 
            if (full_eval_diff > 0.6){
                grades_array = grades_by_analysis[0]
            } else if (full_eval_diff > 0.03){
                grades_array = grades_by_analysis[1]
            } else if (this.moveA == this.parent.best_full_move ){
                grades_array = grades_by_analysis[2]
            } else if (full_eval_diff > -0.05){
                grades_array = grades_by_analysis[3]
            } else if (full_eval_diff > -0.1) {
                grades_array = grades_by_analysis[4]
            } else if (full_eval_diff > -0.2) {
                grades_array = grades_by_analysis[5]
            } else {
                grades_array = grades_by_analysis[6]
            }
            
            //Identify the grading based difficulty
            this.grade = grades_array[4]
            if (difficulty < 0.85) this.grade = grades_array[3] 
            if (difficulty < 0.75) this.grade = grades_array[2] 
            if (difficulty < 0.55) this.grade = grades_array[1] 
            if (difficulty < 0.10) {
                this.grade = grades_array[0] 
            }
            
            this.throw("grade_changed",this)  
            
        }
    }
/*
    grade_move_old = () => {
        if (this.grade!="Book" && this.parent && this.parent.full_eva && this.parent.short_eva) {
            //Only continue if the position has not already been identified as a book position.

            //Only positions with a parent can be graded as what we are actually grading is the 
            // move "between" them

            //Store the old grade so that we know if weve changed it
            var old_grade = this.grade

            var grades_by_analysis = [      ["Good","Good","Good","Inaccuracy","Inaccuracy"],                             //<0.05 drop according to full analysis
                                        ["Inaccuracy","Inaccuracy","Inaccuracy","Mistake","Mistake"],    //<0.10 drop according to full analysis
                                        ["Mistake","Mistake","Mistake","Blunder","Blunder"],  //<0.20 drop according to full analysis
                                        ["Blunder","Blunder","Blunder","Blunder","Blunder"]]        //>= 0.20 drop accoring to full analsis

        
            
            //Calulate the change in eval due to the move w.r.s.t. the person making the move
            var full_eval_diff = p(this.full_eva)-p(this.parent.full_eva) 
            var short_eval_diff = p(this.short_eva[4])-p(this.parent.short_eva[4]) 
            
            
            
            if (this.turn=="w"){
                full_eval_diff = -full_eval_diff
                short_eval_diff = -short_eval_diff
            }

            //Identify which line of grading based on the full analysis delta
            var grades_array 
            if (this.moveA == this.parent.best_full_move){
                grades_array = grades_by_analysis[0]
            } else if (full_eval_diff > -0.05){
                grades_array = grades_by_analysis[1]
            } else if (full_eval_diff > -0.1) {
                grades_array = grades_by_analysis[2]
            } else if (full_eval_diff > -0.2) {
                grades_array = grades_by_analysis[3]
            } else {
                grades_array = grades_by_analysis[4]
            }
            
            //Identify the grading based on the short analysis
            if (this.moveA == this.parent.best_short_move[4]){
                this.grade = grades_array[0]
            } else if (short_eval_diff > -0.05){
                this.grade = grades_array[1]
            } else if (short_eval_diff > -0.1) {
                this.grade = grades_array[2]
            } else if (short_eval_diff > -0.2) {
                this.grade = grades_array[3] 
            } else {this.grade = grades_array[4]}

            if(old_grade != this.grade)
            {
                this.throw("grade_changed",this)
            }
        }
    }
    */
}