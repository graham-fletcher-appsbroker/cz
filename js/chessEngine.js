import {ObjectEvent} from "./objectEvent.js"

export class chessEngineTask {

    constructor(){
        this.final=null
        this.done=false
    }
    start_messages = () => {
        return []
    }

    reply = (line) => {return false}

    then = (f) => {
        this.final = f
        if(this.done)
            this.final()
        return this
    }

    stop = () => {
        this.done= true
        if (this.final != null)
            this.final()

    }

    engine_message = (line) =>{
        if (!this.done){
            if (!this.reply(line)){
                this.stop()
            }
            else
                return true
        }
        return false
    }

    run = (eng) =>{
        eng.request(this)
        return this
    }
}

export class analysis extends chessEngineTask{
    static indexdb= null
    static{
        //Start the process of opening the database for analyses
        if (('indexedDB' in window)) {
            const req = window.indexedDB.open('analysis_results', 3)
            req.onupgradeneeded = (event) => {
                // Save the IDBDatabase interface
                const db = event.target.result;
              
                // Create an objectStore for this database
                if (!db.objectStoreNames.contains('byfen')) {
                    db.createObjectStore('byfen');
                }
              };

            req.onsuccess = (event)  => {
                analysis.indexdb = event.target.result
              };

            req.onerror = (event) => {
                console.log(event)
            }
        }
        else
        {
            console.log("No indexDB")
        }
    }

    constructor(fen,depth){  
        super()
        this.fen=fen
        this.result=[]
        this.depth=depth
        this.is_done=false

        if (analysis.indexdb)
        {
            const tx = analysis.indexdb.transaction('byfen', 'readonly');
            const store = tx.objectStore('byfen');
            const readq = store.get(this.fen)
            
            readq.onsuccess = (v)=>{
                if (v.target.result != undefined){
                    console.log("Found",v.target.result)
                    this.result = v.target.result
                    this.is_done=true
                    this.stop()
                }
            }
            readq.onerror = (e)=>{
                console.log(e)
            }
            


        }
    }

    run_p = (eng) =>{
        console.log("-------------------------")
        console.log(this.is_done,this.result)
        if (!this.is_done){
            return this.run(eng)
        }
        else
        {
            this.stop()
            return this
        }
    }
    save = () =>{
        this.is_done = true
        if (analysis.indexdb)
        { 
            const tx = analysis.indexdb.transaction('byfen', 'readwrite');
            const store = tx.objectStore('byfen');
            store.add(this.result,this.fen);
            return tx.complete;
           
        }
    }

    start_messages = () =>{
        return ["setoption name Clear Hash",
                "position fen " + this.fen,
                "go depth "+String(this.depth)]
    }

    reply = (line) =>{
        var match
        console.log(line)
        /// Is it sending feed back with a score?
        if(match = line.match(/^info depth (\d+).*\bscore (\w+) (-?\d+).*\bpv (\w+)/)) {
            var score = parseInt(match[3]);
            /// Is it measuring in centipawns?
            if(match[2] == 'mate') {
                score = 10000
            }

            this.result.push({depth: match[1],score:score,bestmove:match[4]})
            return true
        }

        /// is the analysis done
        if(match = line.match(/^bestmove (.*)?/)) {
           this.save()
           return false
            
        }

        ///Was something else.. just keep going
        return true
    }
}

export class chessEngine extends ObjectEvent{
    static engine = null;
    static request_queue = []
    static status="none"
    static curent_req=null
    

    static add_request(req){
        console.log("ar")
        chessEngine.request_queue.push(req)
        chessEngine.begin_processing()
    }

    static begin_processing()
    {
        if (!chessEngine.engine)
        {
            chessEngine.status="init"
            chessEngine.engine = new Worker('stockfish.js')
            chessEngine.engine.onmessage = chessEngine.engine_message
        }
        else
            if (chessEngine.status == "idle")
            {
                if (chessEngine.request_queue.length > 0)
                {
                    chessEngine.status == "ready"
                    chessEngine.current_req = chessEngine.request_queue.shift()

                    chessEngine.send_request(chessEngine.current_req)
                }
                else
                {
                    console.log("term")
                    chessEngine.engine.terminate()
                    chessEngine.engine=null
                    chessEngine.status == "none"
                }
            }
    }

    static send_request(req)
    {
        console.log(req)
        if(!req.done) {
            chessEngine.status == "busy"
            for (var m of req.start_messages()){
                chessEngine.engine.postMessage(m)
            }
        }
        else
        {
            chessEngine.status == "idle"
            chessEngine.curent_req = null
            chessEngine.begin_processing()
        }
    }

    static engine_message = (event) =>{
        var line;
        var match;

        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }


        if (chessEngine.status == "init" ){
            chessEngine.status = "idle"
            chessEngine.begin_processing()
        }
        else{
            if (this.current_req == null)
            {
                console.log("Unexpected message")
                return
            }
            if (!this.current_req.engine_message(line))
            {
                chessEngine.status == "idle"
                chessEngine.curent_req = null
                chessEngine.begin_processing()
            }
        }
    }

    request = (x) => {
        x.engine = this
        chessEngine.add_request(x)

    }
}

 