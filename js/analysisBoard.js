import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.js";
import {chessGame} from "./chessGame.js"
import "./jquery-3.6.1.js"
import "./chessboard-1.0.0.js"
import {chessChart} from "./chessChart.js"
import {bookDisplay} from "./bookDisplay.js" 

export class analysisBoard{
    constructor (PGN, board_div, moves_div, controls_div, report_div, chart_div, book_div)
    {
        this.board_div = board_div
        this.moves_div = moves_div
        this.controls_div = controls_div
        this.report_div = report_div
        this.chart_div = chart_div
        this.book_div = book_div
        this.game = new chessGame(PGN)

        if(this.board_div)
            this.board = new Chessboard(this.board_div);

        this.game.html(this.moves_div);

        if (this.contols_div)
            this.game.controls(this.controls_div);

        if (this.report_div)
            this.game.report(this.report_div);

        if (this.chart_div)
            this.chart = new chessChart(this.chart_div,this.game)

        if (this.book_div)
            this.book = new bookDisplay(this.book_div)

        
        
        this.chart.event.on("selected", this.chart_selected)
        this.game.on("move_selected", this.update_board)
        this.game.on("analysis_update", this.analysis_changed)

        $(window).resize(this.window_resize)

        this.game.selectMove("last")
        this.game.analyse()
    }

    analysis_changed = async () => {
        if (this.moves_div)
            this.game.html(this.moves_div);

        if (this.report_div)
            this.game.report(this.report_div);

        if (this.chart_div)
            this.chart.updateLabelsValues()

    }
    
    chart_selected = async (data) => {
        this.game.select(data.move_id)
    }
    update_board = async (move) => {
        if (this.board_div)
            this.board.position(move.fen); 

        this.chart.select(move.id,false)

        if (this.book_div)
            this.book.update(move)
    }

    window_resize = (evt) => {
        if (this.board_div)
            this.board.resize()
    }
}

