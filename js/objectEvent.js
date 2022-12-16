export class ObjectEvent{
    constructor(){
        this.listeners={}
    }

    on = (event,func) =>{
        if (!this.listeners[event])
            throw("Event not registered")

        this.listeners[event].unshift(func)
    }

    throw = (event, data) =>{
        if (this.listeners[event])
        {
            for (var cb of this.listeners[event])
            setTimeout(cb, 0, data);
        }
        else
            throw("Event not registered")
    }

    new_event = (event)=>{
        if (!this.listeners[event])
            this.listeners[event]=[]
    }


}