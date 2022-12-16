import {Chart} from "./chart/dist/chart.js";
import {CategoryScale,LinearScale,ScatterController,LineController,PointElement,LineElement,Filler,Tooltip} from "./chart/dist/chart.js"; 
import {p} from "./chessPosition.js"
import { ObjectEvent } from "./objectEvent.js";
Chart.register(CategoryScale);
Chart.register(LinearScale);
Chart.register(ScatterController);
Chart.register(PointElement);
Chart.register(LineElement);
Chart.register(LineController);
Chart.register(Filler);
Chart.register(Tooltip);

export class chessChart {
    constructor (targetDiv,game){

        this.labels=[]
        this.values=[]
        this.game=game
        this.div=$("#"+targetDiv)
        this.updateLabelsValues()
        this.selected=null
        this.event = new ObjectEvent()

        this.div.get( 0 ).innerHTML = "<canvas id='eval_graph"+targetDiv+"' style='width:100%; height:100%;'></canvas>"
        this.event.new_event("selected")

        this.chart = new Chart(
            $('#eval_graph'+targetDiv).get( 0 ),
            {
                type: 'line',
                data: {
                    labels: this.labels,
                    
                    datasets: [{
                        data: this.values,
                        fill: {
                            target: {
                                value: 0.5
                            },
                            above: 'rgb(250, 250,250)',   // Area will be red above the origin
                            below: 'rgb(120, 120, 120)'    // And blue below the origin
                        },
                        borderColor: 'rgb(0,0,0)',
                        pointBorderColor: (context) => {
                            var index = context.dataIndex;
                            if (this.game.main_line[index].id == this.selected){
                                return "white"
                            }
                            return "rgba(0,0,0,0)";
                          },
                        borderWidth:3,
                        pointBackgroundColor: (context) => {
                            var index = context.dataIndex;
                            if (this.game.main_line[index]){
                                return $("."+this.game.main_line[index].grade).css("--grade_color")
                                
                            }
                            return "rgba(0,0,0,0)";
                          },
                        tension: 0.4
                    }]
                },
                
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation:false,
                    scales: {
                        
                        x: {
                            display: true,
                            ticks:{display :false},
                            grid: {display: false,}
                        },
                        y: {
                            display: true,
                            min:-0.1,
                            max:1.1,
                            ticks:{display :false},
                            grid: {
                                color: (ctx) => (ctx.tick.value === 0.5 ? 'rgba(0, 0, 0, 0.1)' : 'transparent')
                            }
                        }
                    
                    },
                    onClick: (evt) => {
                        const points = this.chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            
                        if (points.length) {
                            const label = this.chart.data.labels[points[0].index];
                            for (var m of this.game.main_line)
                                if (m.descriptor() == label)
                                    this.select(m.id)
                            
                        }
            
                    },
                }

            }) 
    }

    updateLabelsValues = () => {

        for(var m of this.game.main_line){
            var pos = this.labels.indexOf(m.descriptor())
            if (pos>-1)
            {
                this.values[pos] = p(m.full_eva)
            }
            else
            {
                this.labels.push(m.descriptor())
                this.values.push(p(m.full_eva))
            }
        }        

        if(this.chart)
            this.chart.update()
    }


    select = (move_id) =>
    {
        if (move_id != this.selected)
        {
            //Find the move, but only if its in the mainline and therefore on the graph
            var move = this.game.main_line.find((m)=>m.id==move_id)

            if (move){
                this.selected = move.id
                this.event.throw("selected", {"move_id":this.selected})
            }
            this.chart.update()
        }
    }
}
/*
(document.getElementById(div_id), {
            
    type: 'line',
    data: {
        labels: this.moves,
        
        datasets: [{
          data: this.analysis,
          fill: {
            target: {
                value: 0.5
              },
            above: 'rgb(250, 250,250)',   // Area will be red above the origin
            below: 'rgb(120, 120, 120)'    // And blue below the origin
          },
          borderColor: 'rgb(0,0,0)',
          pointBorderColor: 'rgba(0,0,0,0)',
          pointBackgroundColor: (context) => {
            
            var index = context.dataIndex;
            if (this.move_grades[index]){
                var bg_color = $(".grade_report_clickable."+this.move_grades[index]).css('background-color');
                
                return bg_color? bg_color: "blue";
            }
            return "rgba(0,0,0,0)";

            return this.move_grades[index] == this.highlight ? String(this.highlight_color) :  'white'
            
            
          },
          tension: 0.4
        },
        ]
      },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation:false,
        scales: {
            
            x: {
                display: true,
                ticks:{display :false},
                grid: {
                    display: false,
                  }
            },
            y: {
                display: true,
                min:-0.1,
                max:1.1,
                ticks:{display :false},
                grid: {
                    color: (ctx) => (ctx.tick.value === 0.5 ? 'rgba(0, 0, 0, 0.1)' : 'transparent')
                }
            }
        
        },
    
        
        
        
        plugins: {
            tooltip: {
                displayColors: false
            },
            lineAtIndex:{
                xpos: [0,0,0],
                label: ["","",""]

            }
            
        }
        
    }
});
*/