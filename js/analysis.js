import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.js";
import {Chart} from "./chart/dist/chart.js";
import {CategoryScale,LinearScale,ScatterController,LineController,PointElement,LineElement,Filler,Tooltip} from "./chart/dist/chart.js"; 
import {grade_report} from "./grade_move.js"
import {game_phase} from "./game_phases.js"
import {describe_position} from "./find_similar.js"
import "./jquery-3.6.1.js"

Chart.register(CategoryScale);
Chart.register(LinearScale);
Chart.register(ScatterController);
Chart.register(PointElement);
Chart.register(LineElement);
Chart.register(LineController);
Chart.register(Filler);
Chart.register(Tooltip);


const verticalLinePlugin = {
    id:"lineAtIndex",

    getLinePosition: function (chart, pointIndex) {
        const meta = chart.getDatasetMeta(0); // first dataset is used to discover X coordinate of a point
        const data = meta.data;
        return data[pointIndex].x;
        
    },
    renderVerticalLine: function (chartInstance, pointIndex,label) {
        const lineLeftOffset = this.getLinePosition(chartInstance, pointIndex);
        const scale = chartInstance.scales['y'];
        const context = chartInstance.ctx;
  
        // render vertical line
        context.beginPath();
        context.strokeStyle = '#ff0000';
        context.moveTo(lineLeftOffset, scale.top);
        context.lineTo(lineLeftOffset, scale.bottom);
        context.stroke();
  
        // write label
        context.fillStyle = "#ff0000";
        context.textAlign = 'left';
        context.fillText(label, lineLeftOffset+5, scale.top+5);
    },
  
    afterDatasetsDraw: function(chart, easing){
        
        if (chart.config._config.options.plugins.lineAtIndex.xpos.length > 0) {
            for(var l =0; l < chart.config._config.options.plugins.lineAtIndex.xpos.length; l++){
                this.renderVerticalLine(chart, chart.config._config.options.plugins.lineAtIndex.xpos[l],chart.config._config.options.plugins.lineAtIndex.label[l]);
            }
        }
    }
};

Chart.register(verticalLinePlugin);


export class analysis {

  

    constructor(PGN,div_id,depth=10, short_depth=5, onClickCallBack=null, reportDivId=null) {
        this.engine = null
        this.grades=new grade_report(this.gradesClick)
        this.game = new Chess()
        var res = this.game.load_pgn(PGN);
        this.analysis=[]
        this.short_analysis=[]
        this.moves=[]
        this.fen=[]
        this.best_move=[]
        this.short_best_move=[]
        this.raw_moves=[]
        this.depth=depth
        this.short_depth=short_depth
        this.move_grades=[]
        this.onClickCallBack=onClickCallBack
        this.reportDivId=reportDivId
        this.highlight="-"
        this.top_games = []

        if (res)
        {
            this.moves=this.game.history()
            this.raw_moves=this.game.history({verbose:true})
            for(var m=0; m < this.moves.length; m++){
                if (m%2 == 0){
                    this.moves[m] = String(1+(m/2)) +" "+this.moves[m]
                }
                else
                {
                    this.moves[m] = String((m+1)/2) + " ..., "+this.moves[m]
                }
            }
            this.moves.unshift("")
            this.analysis=new Array(this.moves.length).fill(0.5)
            this.short_analysis=new Array(this.moves.length).fill(0.5)
            this.best_move=new Array(this.moves.length).fill("")
            this.short_best_move=new Array(this.moves.length).fill("")
            this.move_grades=new Array(this.moves.length).fill("")
            
            this.fen=new Array(this.moves.length).fill("")
            if (div_id != null){
                this.add_chart(div_id)
            }
            this.analyse_position()
        }
    }

    gradesClick=(evt)=>{

        this.highlight=$(evt.target).attr('highlight')
        this.highlight_color=$(evt.target).css( "background-color" )
        this.chart.update()
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
            var score = parseInt(match[3]) * (this.game.turn() == 'w' ? 1 : -1);
            /// Is it measuring in centipawns?
            if(match[2] == 'mate') {
                if (score==0){
                    score = 10000 * (this.game.turn() == 'w' ? 1 : -1)
                }else
                {
                score = 10000* Math.sign(score) 
                }
                console.log(score)
                
            }
            var probability=1.0/(1.0+Math.exp(-0.004*score))
            var graph_score = (probability)
            if (match[1] == String(this.short_depth))
            {
                
                this.short_analysis[this.game.history().length]=graph_score
            }  
            if (match[1] == String(this.depth))
            {
                
                this.analysis[this.game.history().length]=graph_score
                this.best_move[this.game.history().length]=match[4]
                if(this.chart != null){
                    this.chart_update()
                }
            }  
            
            if (match[1] == String(this.short_depth))
            {
                this.short_analysis[this.game.history().length]=graph_score
                this.short_best_move[this.game.history().length]=match[4]
            }   
        }
    
        /// Did the AI move?
        if(match = line.match(/^bestmove .*?/)) {
            if (this.game.history().length)
            {
                this.game.undo()
                this.analyse_position()
            }
            else
            {
                this.post_analysis()
            }
        }
    };

    async analyse_position(){
        var gph  = game_phase(this.game)
        this.chart.config._config.options.plugins.lineAtIndex.xpos[gph]=this.game.history().length
        this.chart.config._config.options.plugins.lineAtIndex.label[gph]=(gph == 2 ? "End\nGame" : (gph == 1 ? "Middle\nGame" : "Opening"))
        
        if (gph == 0 && this.top_games.length < 100)
        {
            var response = await fetch('https://explorer.lichess.ovh/masters?variant=standard&fen='+encodeURIComponent(this.game.fen()));
            var json = await response.json()
            this.top_games = this.top_games.concat(json.topGames)
            if (!this.book_pos){
                this.book_pos = this.game.history().length
            }
        }
        if (gph == 0 && !this.opening_desc ){
            this.opening_desc = describe_position(this.game)
        }
        if (!this.engine){
            this.engine = new Worker('stockfish.js');
            this.engine.onmessage = this.engine_message
        }

        this.fen[this.game.history().length]=this.game.fen()
        this.engine.postMessage("position fen " + this.game.fen());
        this.engine.postMessage("go depth "+String(this.depth));
    }

    post_analysis = () =>{
        for (var move_number = 1;  move_number < this.moves.length; move_number++)
        {
            this.move_grades[move_number] = this.grades.grade_move(this.analysis[move_number-1],this.short_analysis[move_number-1],
                this.best_move[move_number-1],this.short_best_move[move_number-1],
                this.raw_moves[move_number-1].from+this.raw_moves[move_number-1].to+(this.raw_moves[move_number-1].promotion || ""),
                this.analysis[move_number],
                this.short_analysis[move_number], move_number % 2 == 1, move_number < this.book_pos-1)
        }
        
        document.getElementById(this.reportDivId).innerHTML=this.grades.html()
        this.chart.update()
        this.engine.terminate()
        this.engine=null
        this.find_similar()
        
    }

    chart_update = () => {
        if (this.chart != null){
            this.chart.update()
        }
    };

    add_chart= (div_id) =>{
    }

    find_similar = async () => {
        var dict = {}  
        var best_id = [null,null,null]
        var best_pgn = [null,null,null]
        var best_fen = [null,null,null]
        var best_score = [0,0,0]  

        for (var word of this.opening_desc.split(" ")){
            if (dict[word]){
                dict[word]+=1
            }
            else
            {
                dict[word]=1
            }
        }

        console.log(this.top_games)
        for(var g of this.top_games){
            await sleep(200)
            try{
                var response = await fetch('https://lichess.org/game/export/'+g.id);
                var PGN = await response.text()
                var game = new Chess()
                if (game.load_pgn(PGN)){
                    while(game_phase(game) > 0){
                        game.undo()
                    }
                    var top_desc = describe_position(game)
                    var doc = {}        
                    for (var word of top_desc.split(" ")){
                        if (doc[word]){
                            doc[word]+=1
                        }
                        else
                        {
                            doc[word]=1
                        }
                    }
                    
                    var score = 0
                    for (const [key, value] of Object.entries(dict)) {
                        if (doc[key]){
                            score += (value * doc[key])*(value * doc[key])
                        }
                    }

                    score = Math.sqrt(score)
                    console.log(score)
                    console.log(best_score.length)
                    for(var x = 0; x < best_score.length; x++)
                    {
                        console.log(score,best_score[x])
                        if (score == best_score[x]){
                            break;
                        }
                        if (score > best_score[x])
                        {
                            for (var xx = best_score.length-1; xx > x; xx--){
                                best_score[xx] = best_score[xx-1]
                                best_id[xx] = best_id[xx-1]
                                best_pgn[xx] = best_pgn[xx-1]
                                best_fen[xx] = best_fen[xx-1]
                            }
                            best_score[x] = score
                            best_id[x]=g.id
                            best_pgn[x]=PGN
                            best_fen[x]=game.fen()
                            break
                        }
                    }
                    console.log(best_score)
                    
                }
            }
            catch(e){}
        }

        var html = "<table style='width:100%'>"
        for (var x =0; x < best_score.length; x++){
            html += "<tr><td>"
            html += "<div style='width:min(15vh,15vw)' id='"+best_id[x]+"'>"+best_score[x]+"</div>"
            html += "<table>"
            html += "<tr><td>"+"Player Name"+"</td></tr>"
            html += "</table>"
            html += "</td></tr>"
        }
        html += "</table>"

        $("#similar").html(html)

        for (var x = 0; x < best_score.length; x++){
            var lboard = Chessboard(best_id[x]);
            lboard.position(best_fen[x])
        }
      

    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
 }